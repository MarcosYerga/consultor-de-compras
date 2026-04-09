import type { SearchHit } from '@consultor/api-types';
import type { RetailerConnector } from '../../connector.types.js';
import { fetchJson } from '../../http/fetch-json.js';
import { normalizeLine } from '../../normalize.js';
import { titleSimilarity } from '../../similarity.js';
import { tokenize } from '../../tokenize.js';
import {
  extractProductsDeep,
  flattenCategoryIndex,
  pickCategoryIdsForQuery,
} from './mercadona-categories.js';
import { mapMercadonaProductToSearchHit } from './mercadona-mapper.js';
import type { MercadonaProductJson } from './mercadona-types.js';

const API_BASE = 'https://tienda.mercadona.es/api/v1_1';

export type MercadonaConnectorOptions = {
  /** Código de almacén (`wh`), p. ej. vlc1, mad1. */
  warehouse?: string;
  lang?: string;
  /** Máximo de categorías a expandir por consulta (coste HTTP). */
  maxCategories?: number;
  userAgent?: string;
};

async function mapInChunks<T, R>(items: T[], chunkSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

function productMatchesFreeText(normalizedQuery: string, displayName: string): boolean {
  const sim = titleSimilarity(normalizedQuery, displayName);
  if (sim >= 0.06) return true;
  const dn = normalizeLine(displayName);
  const tokens = tokenize(normalizedQuery);
  return tokens.some((t) => t.length > 2 && dn.includes(t));
}

export function createMercadonaConnector(opts: MercadonaConnectorOptions = {}): RetailerConnector {
  const warehouse = opts.warehouse ?? 'vlc1';
  const lang = opts.lang ?? 'es';
  const maxCategories = opts.maxCategories ?? 10;

  return {
    id: 'mercadona',
    async search(query, searchOpts) {
      const signal = searchOpts?.signal;
      const maxHits = searchOpts?.limit ?? 30;
      const normalized = normalizeLine(query);

      const listUrl = `${API_BASE}/categories/?lang=${lang}&wh=${warehouse}`;
      const listJson = await fetchJson<unknown>(listUrl, { signal, userAgent: opts.userAgent });

      const index = flattenCategoryIndex(listJson);
      const categoryIds = pickCategoryIdsForQuery(normalized, index, maxCategories);

      const detailJsons = await mapInChunks(categoryIds, 4, async (id) => {
        try {
          return await fetchJson<unknown>(`${API_BASE}/categories/${id}/?lang=${lang}&wh=${warehouse}`, {
            signal,
            userAgent: opts.userAgent,
          });
        } catch {
          // Algunas IDs del árbol no son expandibles por endpoint de detalle (404).
          return null;
        }
      });

      const productsAcc: MercadonaProductJson[] = [];
      for (const detail of detailJsons) {
        if (!detail) continue;
        productsAcc.push(...extractProductsDeep(detail));
      }

      const byId = new Map<string, MercadonaProductJson>();
      for (const p of productsAcc) {
        if (!byId.has(p.id)) byId.set(p.id, p);
      }

      const unique = [...byId.values()];
      const scored = unique
        .map((p) => ({
          p,
          sim: titleSimilarity(normalized, p.display_name),
          keep: productMatchesFreeText(normalized, p.display_name),
        }))
        .filter((x) => x.keep);

      const pool =
        scored.length > 0
          ? scored
          : unique.map((p) => ({
              p,
              sim: titleSimilarity(normalized, p.display_name),
              keep: true,
            }));

      pool.sort((a, b) => b.sim - a.sim);

      const hits: SearchHit[] = [];
      for (const { p } of pool.slice(0, maxHits)) {
        const hit = mapMercadonaProductToSearchHit(p);
        if (hit) hits.push(hit);
      }

      return hits;
    },

    async healthcheck() {
      const t0 = Date.now();
      try {
        await fetchJson(`${API_BASE}/categories/?lang=${lang}&wh=${warehouse}`, {
          userAgent: opts.userAgent,
        });
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, latency_ms: Date.now() - t0, error: msg };
      }
    },
  };
}
