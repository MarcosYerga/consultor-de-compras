import type { RetailerConnector } from '../../connector.types.js';
import { fetchHtml } from '../../http/fetch-html.js';
import { fetchJson } from '../../http/fetch-json.js';
import { mapLidlSearchResponseToHits } from './lidl-mapper.js';
import { parseLidlSearchHtmlToHits } from './lidl-search-html.js';

export type LidlConnectorOptions = {
  /** Origen público del sitio Lidl ES (sin barra final). */
  origin?: string;
  /** Tamaño de página pedido a la API (máx. razonable para multimarca). */
  fetchSize?: number;
  userAgent?: string;
};

/** Versión alineada con el front Lidl (config `searchApiVersion` en página). */
const SEARCH_API_VERSION = 'v2.1.0';

/**
 * Búsqueda: intenta la API JSON (`/q/api/search`); si falla o viene vacía, parsea el HTML de
 * `/q/search` (misma estrategia que otros scrapers cuando la API exige entorno navegador / 401).
 */
export function createLidlConnector(opts: LidlConnectorOptions = {}): RetailerConnector {
  const origin = opts.origin ?? 'https://www.lidl.es';
  const fetchSize = opts.fetchSize ?? 30;

  return {
    id: 'lidl',
    async search(query, searchOpts) {
      const signal = searchOpts?.signal;
      const limit = searchOpts?.limit ?? 30;
      const params = new URLSearchParams({
        assortment: 'ES',
        locale: 'es_ES',
        version: SEARCH_API_VERSION,
        query,
        fetchsize: String(Math.min(fetchSize, limit, 48)),
      });
      const apiUrl = `${origin}/q/api/search?${params.toString()}`;
      const referer = `${origin}/q/search?${new URLSearchParams({ query }).toString()}`;

      try {
        const json = await fetchJson<unknown>(apiUrl, {
          signal,
          userAgent: opts.userAgent,
          corsContext: { origin, referer },
        });
        const fromApi = mapLidlSearchResponseToHits(json, origin, limit);
        if (fromApi.length > 0) return fromApi;
      } catch {
        /* API a menudo responde 401 fuera del navegador → HTML */
      }

      const html = await fetchHtml(
        `${origin}/q/search?${new URLSearchParams({ query }).toString()}`,
        {
          signal,
          userAgent: opts.userAgent,
          referer: `${origin}/`,
          browserLike: true,
        },
      );
      return parseLidlSearchHtmlToHits(html, origin, limit);
    },

    async healthcheck() {
      const t0 = Date.now();
      const params = new URLSearchParams({
        assortment: 'ES',
        locale: 'es_ES',
        version: SEARCH_API_VERSION,
        query: 'leche',
        fetchsize: '1',
      });
      const apiUrl = `${origin}/q/api/search?${params.toString()}`;
      const referer = `${origin}/q/search?${new URLSearchParams({ query: 'leche' }).toString()}`;

      try {
        await fetchJson(apiUrl, {
          userAgent: opts.userAgent,
          corsContext: { origin, referer },
        });
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch {
        try {
          const html = await fetchHtml(
            `${origin}/q/search?${new URLSearchParams({ query: 'leche' }).toString()}`,
            {
              userAgent: opts.userAgent,
              referer: `${origin}/`,
              browserLike: true,
            },
          );
          if (html.includes('&quot;fullTitle&quot;') && html.includes('&quot;canonicalUrl&quot;')) {
            return { ok: true, latency_ms: Date.now() - t0 };
          }
          return {
            ok: false,
            latency_ms: Date.now() - t0,
            error: 'Lidl: HTML de búsqueda sin datos de producto',
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { ok: false, latency_ms: Date.now() - t0, error: msg };
        }
      }
    },
  };
}
