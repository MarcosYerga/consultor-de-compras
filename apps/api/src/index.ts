import {
  buildConnectorRegistry,
  createAhorramasConnector,
  createCarrefourConnector,
  createDiaConnector,
  createElCorteInglesConnector,
  createEroskiConnector,
  createLidlConnector,
  createMercadonaConnector,
  createMockConnector,
  type RetailerConnector,
} from '@consultor/connectors';
import { buildApp } from './app.js';
import { readEnv } from './env.js';
import { createConnectorWithLiveCacheFallback } from './live-cache-connector.js';

const env = readEnv();

function withLiveCache(live: RetailerConnector) {
  return createConnectorWithLiveCacheFallback(live, {
    cacheFilePath: env.liveCacheFile,
    maxAgeMs: env.liveCacheMaxAgeMinutes * 60 * 1000,
  });
}

type RetailerMode = 'live' | 'mock';

function buildRetailerConnector(
  retailerId: Parameters<typeof createMockConnector>[0],
  mode: RetailerMode,
  createLive: () => RetailerConnector,
): RetailerConnector {
  if (mode === 'live') {
    return withLiveCache(createLive());
  }
  return createMockConnector(retailerId);
}

const registry = buildConnectorRegistry({
  mercadona: buildRetailerConnector('mercadona', env.mercadonaMode, () =>
    createMercadonaConnector({ warehouse: env.mercadonaWarehouse }),
  ),
  lidl: buildRetailerConnector('lidl', env.lidlMode, () => createLidlConnector()),
  dia: buildRetailerConnector('dia', env.diaMode, () => createDiaConnector()),
  ahorramas: buildRetailerConnector('ahorramas', env.ahorramasMode, () => createAhorramasConnector()),
  eroski: buildRetailerConnector('eroski', env.eroskiMode, () => createEroskiConnector()),
  carrefour: buildRetailerConnector('carrefour', env.carrefourMode, () => createCarrefourConnector()),
  el_corte_ingles: buildRetailerConnector('el_corte_ingles', env.elCorteInglesMode, () =>
    createElCorteInglesConnector(),
  ),
});

const app = await buildApp({
  getConnectorRegistry: () => registry,
});

await app.listen({ port: env.port, host: env.host });
