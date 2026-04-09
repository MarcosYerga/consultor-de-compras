import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SearchHit } from '@consultor/api-types';
import type { RetailerConnector } from '@consultor/connectors';

type CacheEntry = {
  updated_at: string;
  hits: SearchHit[];
};

type CacheFileV1 = {
  version: 1;
  entries: Record<string, CacheEntry>;
};

function annotateSource(hits: SearchHit[], source: 'live' | 'stale'): SearchHit[] {
  return hits.map((h) => ({ ...h, source }));
}

function stripSource(hits: SearchHit[]): SearchHit[] {
  return hits.map(({ source: _source, ...rest }) => rest);
}

function buildCacheKey(retailerId: string, query: string, limit?: number): string {
  const normalizedQuery = query.trim().toLowerCase();
  return `${retailerId}::${normalizedQuery}::${limit ?? 'na'}`;
}

class LiveSearchFileCache {
  private loaded = false;
  private entries = new Map<string, CacheEntry>();
  private writeQueue = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CacheFileV1>;
      if (parsed.version !== 1 || typeof parsed.entries !== 'object' || parsed.entries == null) {
        return;
      }
      for (const [key, entry] of Object.entries(parsed.entries)) {
        if (!entry || typeof entry !== 'object') continue;
        if (typeof entry.updated_at !== 'string') continue;
        if (!Array.isArray(entry.hits)) continue;
        this.entries.set(key, {
          updated_at: entry.updated_at,
          hits: entry.hits,
        });
      }
    } catch {
      // Si no existe o está corrupto, empezamos cache limpia.
    }
  }

  private async persist(): Promise<void> {
    const payload: CacheFileV1 = {
      version: 1,
      entries: Object.fromEntries(this.entries),
    };

    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(payload), 'utf8');
    await rename(tmp, this.filePath);
  }

  async set(key: string, hits: SearchHit[]): Promise<void> {
    await this.ensureLoaded();
    this.entries.set(key, {
      updated_at: new Date().toISOString(),
      hits: stripSource(hits),
    });

    this.writeQueue = this.writeQueue.catch(() => undefined).then(() => this.persist());
    await this.writeQueue;
  }

  async getFresh(key: string, maxAgeMs: number): Promise<SearchHit[] | null> {
    await this.ensureLoaded();
    const entry = this.entries.get(key);
    if (!entry) return null;

    const updatedAtMs = Date.parse(entry.updated_at);
    if (!Number.isFinite(updatedAtMs)) return null;

    if (Date.now() - updatedAtMs > maxAgeMs) {
      return null;
    }

    return entry.hits;
  }
}

const sharedCaches = new Map<string, LiveSearchFileCache>();

function getSharedCache(filePath: string): LiveSearchFileCache {
  const existing = sharedCaches.get(filePath);
  if (existing) return existing;

  const created = new LiveSearchFileCache(filePath);
  sharedCaches.set(filePath, created);
  return created;
}

export type LiveCacheFallbackOptions = {
  cacheFilePath: string;
  maxAgeMs: number;
};

/**
 * Wrapper realista para producción:
 * - Usa live siempre que haya respuesta con hits.
 * - Si live falla o devuelve vacío, intenta reutilizar la última respuesta live cacheada.
 * - Nunca inventa precios: si no hay live ni cache fresca, propaga el error/resultado vacío.
 */
export function createConnectorWithLiveCacheFallback(
  live: RetailerConnector,
  options: LiveCacheFallbackOptions,
): RetailerConnector {
  const cache = getSharedCache(options.cacheFilePath);

  return {
    id: live.id,
    async search(query, opts) {
      const cacheKey = buildCacheKey(live.id, query, opts?.limit);
      let liveError: unknown = null;

      try {
        const liveHits = await live.search(query, opts);
        if (liveHits.length > 0) {
          const annotatedLiveHits = annotateSource(liveHits, 'live');
          try {
            await cache.set(cacheKey, annotatedLiveHits);
          } catch {
            // Un fallo de persistencia no debe romper la respuesta live.
          }
          return annotatedLiveHits;
        }
      } catch (error) {
        liveError = error;
      }

      const cachedHits = await cache.getFresh(cacheKey, options.maxAgeMs);
      if (cachedHits && cachedHits.length > 0) {
        return annotateSource(cachedHits, 'stale');
      }

      if (liveError) {
        throw liveError;
      }

      return [];
    },

    async healthcheck() {
      return live.healthcheck();
    },
  };
}
