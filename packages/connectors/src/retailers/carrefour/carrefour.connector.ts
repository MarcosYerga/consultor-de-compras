import type { RetailerConnector } from '../../connector.types.js';
import { fetchHtml } from '../../http/fetch-html.js';
import { parseNextDataSearchHtml } from '../../util/next-data-products.js';

export type CarrefourConnectorOptions = {
  origin?: string;
  userAgent?: string;
};

function looksWafOrBlocked(html: string): boolean {
  return /cloudflare|cf-ray|Attention Required|Access Denied|errors\.edgesuite/i.test(html);
}

export function createCarrefourConnector(opts: CarrefourConnectorOptions = {}): RetailerConnector {
  const origin = opts.origin ?? 'https://www.carrefour.es';

  return {
    id: 'carrefour',
    async search(query, searchOpts) {
      const limit = searchOpts?.limit ?? 30;
      const signal = searchOpts?.signal;
      const params = new URLSearchParams({ q: query, language: 'es' });
      const url = `${origin}/s?${params.toString()}`;
      const html = await fetchHtml(url, {
        signal,
        userAgent: opts.userAgent,
        referer: `${origin}/`,
        browserLike: true,
      });
      if (!html.includes('__NEXT_DATA__')) {
        if (looksWafOrBlocked(html)) {
          throw new Error('Carrefour: respuesta bloqueada (WAF)');
        }
      }
      return parseNextDataSearchHtml(html, origin, limit);
    },

    async healthcheck() {
      const t0 = Date.now();
      try {
        await fetchHtml(`${origin}/`, {
          userAgent: opts.userAgent,
          referer: `${origin}/`,
          browserLike: true,
        });
        return { ok: true, latency_ms: Date.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, latency_ms: Date.now() - t0, error: msg };
      }
    },
  };
}
