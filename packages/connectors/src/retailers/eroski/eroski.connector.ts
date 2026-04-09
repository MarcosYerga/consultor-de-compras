import type { RetailerConnector } from '../../connector.types.js';
import { fetchHtml } from '../../http/fetch-html.js';
import { parseEroskiSearchHtml } from './eroski-parse-search.js';

export type EroskiConnectorOptions = {
  /** Origen del supermercado online (sin barra final). */
  origin?: string;
  userAgent?: string;
};

/**
 * Búsqueda en supermercado.eroski.es: HTML de resultados con `data-metrics` (nombre y precio).
 */
export function createEroskiConnector(opts: EroskiConnectorOptions = {}): RetailerConnector {
  const origin = opts.origin ?? 'https://supermercado.eroski.es';

  return {
    id: 'eroski',
    async search(query, searchOpts) {
      const limit = searchOpts?.limit ?? 30;
      const signal = searchOpts?.signal;
      const params = new URLSearchParams({ q: query });
      const url = `${origin}/es/search/results/?${params.toString()}`;
      const html = await fetchHtml(url, {
        signal,
        userAgent: opts.userAgent,
        referer: `${origin}/`,
        browserLike: true,
      });
      return parseEroskiSearchHtml(html, origin, limit);
    },

    async healthcheck() {
      const t0 = Date.now();
      try {
        const params = new URLSearchParams({ q: 'leche' });
        const html = await fetchHtml(`${origin}/es/search/results/?${params.toString()}`, {
          userAgent: opts.userAgent,
          referer: `${origin}/`,
          browserLike: true,
        });
        const hits = parseEroskiSearchHtml(html, origin, 1);
        if (hits.length === 0) {
          return {
            ok: false,
            latency_ms: Date.now() - t0,
            error: 'Eroski: sin productos en HTML de búsqueda',
          };
        }
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, latency_ms: Date.now() - t0, error: msg };
      }
    },
  };
}
