import type { SearchHit } from '@consultor/api-types';
import type { RetailerConnector } from '../../connector.types.js';
import { fetchHtml } from '../../http/fetch-html.js';
import { mapDiaProductToSearchHit } from './dia-mapper.js';
import { extractDiaSearchItemsFromHtml } from './dia-extract.js';

export type DiaConnectorOptions = {
  origin?: string;
  userAgent?: string;
};

export function createDiaConnector(opts: DiaConnectorOptions = {}): RetailerConnector {
  const origin = opts.origin ?? 'https://www.dia.es';

  return {
    id: 'dia',
    async search(query, searchOpts) {
      const signal = searchOpts?.signal;
      const limit = searchOpts?.limit ?? 30;
      const q = encodeURIComponent(query.trim());
      const url = `${origin}/search?q=${q}`;
      const html = await fetchHtml(url, { signal, userAgent: opts.userAgent });
      const rawItems = extractDiaSearchItemsFromHtml(html);
      const hits: SearchHit[] = [];
      for (const p of rawItems) {
        const hit = mapDiaProductToSearchHit(p, origin);
        if (hit) hits.push(hit);
        if (hits.length >= limit) break;
      }
      return hits;
    },

    async healthcheck() {
      const t0 = Date.now();
      try {
        await fetchHtml(`${origin}/search?q=leche`, { userAgent: opts.userAgent });
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, latency_ms: Date.now() - t0, error: msg };
      }
    },
  };
}
