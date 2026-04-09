import type { RetailerConnector } from '../../connector.types.js';
import { fetchHtml } from '../../http/fetch-html.js';
import { parseAhorramasSearchHtml } from './ahorramas-parse.js';

export type AhorramasConnectorOptions = {
  origin?: string;
  userAgent?: string;
};

const SEARCH_AJAX =
  '/on/demandware.store/Sites-Ahorramas-Site/es/Search-ShowAjax';

export function createAhorramasConnector(opts: AhorramasConnectorOptions = {}): RetailerConnector {
  const origin = opts.origin ?? 'https://www.ahorramas.com';

  return {
    id: 'ahorramas',
    async search(query, searchOpts) {
      const signal = searchOpts?.signal;
      const limit = searchOpts?.limit ?? 30;
      const params = new URLSearchParams({
        q: query.trim(),
        start: '0',
        sz: String(Math.min(limit, 48)),
      });
      const url = `${origin}${SEARCH_AJAX}?${params.toString()}`;
      const html = await fetchHtml(url, { signal, userAgent: opts.userAgent });
      const hits = parseAhorramasSearchHtml(html, origin);
      return hits.slice(0, limit);
    },

    async healthcheck() {
      const t0 = Date.now();
      try {
        await fetchHtml(`${origin}/buscador?q=leche`, { userAgent: opts.userAgent });
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, latency_ms: Date.now() - t0, error: msg };
      }
    },
  };
}
