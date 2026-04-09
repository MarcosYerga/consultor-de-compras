import { fileURLToPath } from 'node:url';

const defaultLiveCacheFile = fileURLToPath(
  new URL('../.cache/live-search-cache.json', import.meta.url),
);

function positiveNumberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function readEnv() {
  return {
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? '0.0.0.0',
    demoMode: process.env.DEMO_MODE === 'true',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    /** `live`: API JSON tienda.mercadona.es (v1_1). `mock`: datos simulados. */
    mercadonaMode: process.env.MERCADONA_MODE === 'live' ? ('live' as const) : ('mock' as const),
    mercadonaWarehouse: process.env.MERCADONA_WAREHOUSE ?? 'vlc1',
    /** `live`: API JSON búsqueda www.lidl.es/q/api/search. `mock`: simulado. */
    lidlMode: process.env.LIDL_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** `live`: HTML SSR dia.es/search + JSON embebido. */
    diaMode: process.env.DIA_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** `live`: HTML Search-ShowAjax ahorramas.com (SFCC). */
    ahorramasMode: process.env.AHORRAMAS_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** `live`: HTML de búsqueda supermercado.eroski.es (data-metrics en resultados). */
    eroskiMode: process.env.EROSKI_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** `live`: HTML con __NEXT_DATA__ (puede chocar con WAF Cloudflare). */
    carrefourMode: process.env.CARREFOUR_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** `live`: HTML supermercado (Akamai/WAF puede bloquear IPs de servidor). */
    elCorteInglesMode:
      process.env.EL_CORTE_INGLES_MODE === 'live' ? ('live' as const) : ('mock' as const),
    /** Ruta de cache de respuestas live para fallback real (dato stale). */
    liveCacheFile: process.env.LIVE_CACHE_FILE ?? defaultLiveCacheFile,
    /** Ventana de frescura del cache live antes de considerarlo caducado. */
    liveCacheMaxAgeMinutes: positiveNumberFromEnv(process.env.LIVE_CACHE_MAX_AGE_MINUTES, 360),
  };
}
