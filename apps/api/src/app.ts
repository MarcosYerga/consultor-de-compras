import Fastify, { type FastifySchema } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import { compareRequestSchema } from '@consultor/api-types';
import type { RetailerId } from '@consultor/api-types';
import type { RetailerConnector } from '@consultor/connectors';
import { compareShoppingLines, createMockConnectorRegistry, listRetailers } from '@consultor/connectors';

export type AppDependencies = {
  getConnectorRegistry: () => Record<RetailerId, RetailerConnector>;
};

type CorsOrigin = boolean | string | string[];

export type AppRuntimeConfig = {
  demoMode: boolean;
  nodeEnv: string;
  retailerTimeoutMs: number;
  swaggerEnabled: boolean;
  swaggerRoutePrefix: string;
  apiPublicUrl?: string;
  corsOrigin: CorsOrigin;
};

const DEFAULT_RUNTIME_CONFIG: AppRuntimeConfig = {
  demoMode: false,
  nodeEnv: 'development',
  retailerTimeoutMs: 8000,
  swaggerEnabled: true,
  swaggerRoutePrefix: '/docs',
  apiPublicUrl: undefined,
  corsOrigin: true,
};

const errorResponseSchema = {
  type: 'object',
  required: ['error', 'message', 'request_id'],
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    request_id: { type: 'string' },
    details: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
} as const;

const healthRouteSchema: FastifySchema = {
  tags: ['system'],
  summary: 'Health del servicio',
  response: {
    200: {
      type: 'object',
      required: ['ok', 'service'],
      properties: {
        ok: { type: 'boolean' },
        service: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

const retailersRouteSchema: FastifySchema = {
  tags: ['retailers'],
  summary: 'Lista de cadenas soportadas',
  response: {
    200: {
      type: 'object',
      required: ['retailers'],
      properties: {
        retailers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
};

const retailersHealthRouteSchema: FastifySchema = {
  tags: ['retailers'],
  summary: 'Healthcheck por cadena',
  response: {
    200: {
      type: 'object',
      required: ['retailers'],
      properties: {
        retailers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'ok', 'latency_ms', 'error'],
            properties: {
              id: { type: 'string' },
              ok: { type: 'boolean' },
              latency_ms: { type: 'number' },
              error: { type: ['string', 'null'] },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
};

const compareRouteSchema: FastifySchema = {
  tags: ['compare'],
  summary: 'Compara líneas de compra entre cadenas',
  querystring: {
    type: 'object',
    properties: {
      demo: {
        type: 'string',
        enum: ['1'],
        description: 'Si es 1, fuerza conectores demo para esta petición.',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['lines'],
    properties: {
      lines: {
        type: 'array',
        minItems: 1,
        maxItems: 40,
        items: { type: 'string', maxLength: 800 },
      },
      mode: {
        type: 'string',
        enum: ['per_item', 'basket'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      required: ['compared_at', 'demo', 'items'],
      properties: {
        compared_at: { type: 'string', format: 'date-time' },
        demo: { type: 'boolean' },
        mode: { type: 'string', enum: ['per_item', 'basket'] },
        items: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
        basket: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export async function buildApp(
  deps: AppDependencies,
  runtimeConfig: Partial<AppRuntimeConfig> = {},
) {
  const config: AppRuntimeConfig = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...runtimeConfig,
  };

  const app = Fastify({
    logger: config.nodeEnv === 'production',
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  if (config.swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Consultor de Compras API',
          description:
            'API para comparar líneas de compra entre supermercados con estrategia live/stale/demo.',
          version: '1.0.0',
        },
        servers: config.apiPublicUrl ? [{ url: config.apiPublicUrl }] : undefined,
        tags: [
          { name: 'system', description: 'Health y metadata de servicio' },
          { name: 'retailers', description: 'Catálogo y disponibilidad por cadena' },
          { name: 'compare', description: 'Comparación de precios por línea y cesta' },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: config.swaggerRoutePrefix,
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Petición inválida',
        request_id: req.id,
        details: err.flatten(),
      });
    }
    app.log.error(err);
    return reply.status(500).send({
      error: 'internal_error',
      message: 'Error interno',
      request_id: req.id,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: 'not_found',
      message: 'Ruta no encontrada',
      request_id: request.id,
    });
  });

  app.get('/v1/health', { schema: healthRouteSchema }, async () => {
    return { ok: true, service: 'consultor-de-compras-api' };
  });

  app.get('/v1/retailers', { schema: retailersRouteSchema }, async () => {
    return { retailers: listRetailers() };
  });

  app.get('/v1/retailers/health', { schema: retailersHealthRouteSchema }, async () => {
    const registry = deps.getConnectorRegistry();
    const ids = Object.keys(registry) as RetailerId[];
    const results = await Promise.all(
      ids.map(async (id) => {
        const started = Date.now();
        try {
          const h = await registry[id]!.healthcheck();
          return {
            id,
            ok: h.ok,
            latency_ms: h.latency_ms,
            error: h.error ?? null,
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { id, ok: false, latency_ms: Date.now() - started, error: msg };
        }
      }),
    );
    return { retailers: results };
  });

  app.post<{
    Querystring: { demo?: string };
  }>('/v1/compare', { schema: compareRouteSchema }, async (request) => {
    const body = compareRequestSchema.parse(request.body);
    const demoQuery = request.query.demo === '1';
    const demo = demoQuery || config.demoMode;

    const registry = demo ? createMockConnectorRegistry() : deps.getConnectorRegistry();
    const response = await compareShoppingLines(body.lines, registry, {
      demo,
      retailerTimeoutMs: config.retailerTimeoutMs,
      mode: body.mode,
    });

    return response;
  });

  return app;
}
