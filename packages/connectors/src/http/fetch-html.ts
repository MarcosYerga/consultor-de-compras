import { resolveUserAgent } from './user-agent.js';

const CHROME_LIKE_SEC = {
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
} as const;

export type FetchHtmlOptions = {
  signal?: AbortSignal;
  userAgent?: string;
  /** Algunos sitios (p. ej. Carrefour) exigen Referer para no devolver 403/WAF. */
  referer?: string;
  /**
   * Cabeceras tipo Chrome (Sec-Fetch-*, Upgrade-Insecure-Requests). Algunos WAF
   * son más permisivos que con peticiones minimalistas (no sustituye TLS “real”).
   */
  browserLike?: boolean;
};

export async function fetchHtml(url: string, opts: FetchHtmlOptions = {}): Promise<string> {
  const ua = resolveUserAgent(opts.userAgent);
  const secSite =
    opts.referer && new URL(opts.referer).origin === new URL(url).origin
      ? 'same-origin'
      : opts.referer
        ? 'same-site'
        : 'none';

  const accept = opts.browserLike
    ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    : 'text/html,application/xhtml+xml';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: accept,
      'Accept-Language': opts.browserLike ? 'es-ES,es;q=0.9,en;q=0.8' : 'es-ES,es;q=0.9',
      'User-Agent': ua,
      ...(opts.referer ? { Referer: opts.referer } : {}),
      ...(opts.browserLike
        ? {
            ...CHROME_LIKE_SEC,
            'Sec-Fetch-Site': secSite,
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
          }
        : {}),
    },
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en ${url}`);
  }
  return res.text();
}
