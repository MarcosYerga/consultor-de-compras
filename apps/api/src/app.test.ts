import { describe, expect, it } from 'vitest';
import { createMockConnectorRegistry } from '@consultor/connectors';
import type { RetailerId } from '@consultor/api-types';
import { buildApp } from './app.js';

describe('API v1', () => {
  it('GET /v1/health', async () => {
    const registry = createMockConnectorRegistry();
    const app = await buildApp({ getConnectorRegistry: () => registry });
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
    await app.close();
  });

  it('POST /v1/compare (mock)', async () => {
    const registry = createMockConnectorRegistry();
    const app = await buildApp({ getConnectorRegistry: () => registry });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/compare',
      headers: { 'content-type': 'application/json' },
      payload: { lines: ['leche 1l'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: unknown[] };
    expect(body.items.length).toBe(1);
    await app.close();
  });

  it('POST /v1/compare?demo=1 no usa conectores live del registro', async () => {
    let searchCalls = 0;
    const makeConnector = (id: RetailerId) => ({
      id,
      async search() {
        searchCalls += 1;
        return [];
      },
      async healthcheck() {
        return { ok: true, latency_ms: 1 };
      },
    });

    const registry = {
      ahorramas: makeConnector('ahorramas'),
      carrefour: makeConnector('carrefour'),
      dia: makeConnector('dia'),
      el_corte_ingles: makeConnector('el_corte_ingles'),
      eroski: makeConnector('eroski'),
      lidl: makeConnector('lidl'),
      mercadona: makeConnector('mercadona'),
    };

    const app = await buildApp({ getConnectorRegistry: () => registry });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/compare?demo=1',
      headers: { 'content-type': 'application/json' },
      payload: { lines: ['leche 1l'] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { demo: boolean };
    expect(body.demo).toBe(true);
    expect(searchCalls).toBe(0);
    await app.close();
  });
});
