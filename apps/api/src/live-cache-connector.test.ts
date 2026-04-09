import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import type { RetailerConnector } from '@consultor/connectors';
import { createConnectorWithLiveCacheFallback } from './live-cache-connector.js';

function makeHit(label: string) {
  return {
    title: label,
    pack_price_eur: 1.23,
    product_url: 'https://example.com/p/1',
  };
}

async function makeTmpCacheFilePath(name: string): Promise<string> {
  const dir = join(tmpdir(), `consultor-api-cache-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return join(dir, `${name}.json`);
}

describe('createConnectorWithLiveCacheFallback', () => {
  it('usa stale cache si live falla después de una respuesta live válida', async () => {
    let calls = 0;
    const live: RetailerConnector = {
      id: 'eroski',
      async search() {
        calls += 1;
        if (calls === 1) {
          return [makeHit('leche fresca')];
        }
        throw new Error('upstream down');
      },
      async healthcheck() {
        return { ok: true, latency_ms: 1 };
      },
    };

    const cachePath = await makeTmpCacheFilePath('fallback-success');
    const wrapped = createConnectorWithLiveCacheFallback(live, {
      cacheFilePath: cachePath,
      maxAgeMs: 10 * 60 * 1000,
    });

    const first = await wrapped.search('leche 1 l');
    expect(first).toHaveLength(1);
    expect(first[0]?.source).toBe('live');

    const second = await wrapped.search('leche 1 l');
    expect(second).toHaveLength(1);
    expect(second[0]?.source).toBe('stale');

    await rm(cachePath, { force: true });
  });

  it('propaga error live si no hay cache fresca para la query', async () => {
    const live: RetailerConnector = {
      id: 'dia',
      async search() {
        throw new Error('network blocked');
      },
      async healthcheck() {
        return { ok: true, latency_ms: 1 };
      },
    };

    const cachePath = await makeTmpCacheFilePath('fallback-miss');
    const wrapped = createConnectorWithLiveCacheFallback(live, {
      cacheFilePath: cachePath,
      maxAgeMs: 10 * 60 * 1000,
    });

    await expect(wrapped.search('arroz redondo 1 kg')).rejects.toThrow('network blocked');

    await rm(cachePath, { force: true });
  });

  it('devuelve vacío si live responde vacío y no hay cache', async () => {
    const live: RetailerConnector = {
      id: 'mercadona',
      async search() {
        return [];
      },
      async healthcheck() {
        return { ok: true, latency_ms: 1 };
      },
    };

    const cachePath = await makeTmpCacheFilePath('fallback-empty-live');
    const wrapped = createConnectorWithLiveCacheFallback(live, {
      cacheFilePath: cachePath,
      maxAgeMs: 10 * 60 * 1000,
    });

    await expect(wrapped.search('producto raro xyz')).resolves.toEqual([]);

    await rm(cachePath, { force: true });
  });

  it('acota el tamaño de cache y elimina entradas antiguas', async () => {
    const live: RetailerConnector = {
      id: 'lidl',
      async search(query) {
        return [makeHit(`hit-${query}`)];
      },
      async healthcheck() {
        return { ok: true, latency_ms: 1 };
      },
    };

    const cachePath = await makeTmpCacheFilePath('fallback-max-entries');
    const wrapped = createConnectorWithLiveCacheFallback(live, {
      cacheFilePath: cachePath,
      maxAgeMs: 10 * 60 * 1000,
      maxEntries: 2,
    });

    await wrapped.search('query a');
    await wrapped.search('query b');
    await wrapped.search('query c');

    const raw = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as { entries?: Record<string, unknown> };
    const keys = Object.keys(parsed.entries ?? {});

    expect(keys).toHaveLength(2);
    expect(keys.some((k) => k.includes('query a'))).toBe(false);
    expect(keys.some((k) => k.includes('query b'))).toBe(true);
    expect(keys.some((k) => k.includes('query c'))).toBe(true);

    await rm(cachePath, { force: true });
  });
});
