import { resolveUserAgent } from './user-agent.js';

export type FetchJsonOptions = {
  signal?: AbortSignal;
  userAgent?: string;
  /**
   * Cabeceras tipo petición XHR desde el propio origen (Origin, Referer, Sec-Fetch-*).
   * Algunas APIs solo responden en el navegador; en Node suele seguir fallando sin TLS de Chrome.
   */
  corsContext?: { origin: string; referer: string };
};

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES,es;q=0.9',
      'User-Agent': resolveUserAgent(opts.userAgent),
      ...(opts.corsContext
        ? {
            Origin: opts.corsContext.origin,
            Referer: opts.corsContext.referer,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
          }
        : {}),
    },
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en ${url}`);
  }

  return res.json() as Promise<T>;
}
