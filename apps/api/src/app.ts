import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { compareRequestSchema } from '@consultor/api-types';
import type { RetailerId } from '@consultor/api-types';
import type { RetailerConnector } from '@consultor/connectors';
import { compareShoppingLines, createMockConnectorRegistry, listRetailers } from '@consultor/connectors';
import { readEnv } from './env.js';

export type AppDependencies = {
  getConnectorRegistry: () => Record<RetailerId, RetailerConnector>;
};

export async function buildApp(deps: AppDependencies) {
  const env = readEnv();
  const app = Fastify({
    logger: env.nodeEnv === 'production',
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Petición inválida',
        details: err.flatten(),
      });
    }
    app.log.error(err);
    return reply.status(500).send({ error: 'internal_error', message: 'Error interno' });
  });

  app.get('/v1/health', async () => {
    return { ok: true, service: 'consultor-de-compras-api' };
  });

  app.get('/v1/retailers', async () => {
    return { retailers: listRetailers() };
  });

  app.get('/v1/retailers/health', async () => {
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
  }>('/v1/compare', async (request) => {
    const body = compareRequestSchema.parse(request.body);
    const demoQuery = request.query.demo === '1';
    const demo = demoQuery || env.demoMode;

    const registry = demo ? createMockConnectorRegistry() : deps.getConnectorRegistry();
    const response = await compareShoppingLines(body.lines, registry, {
      demo,
      retailerTimeoutMs: 8000,
      mode: body.mode,
    });

    return response;
  });

  return app;
}
