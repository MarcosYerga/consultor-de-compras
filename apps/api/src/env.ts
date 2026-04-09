import { fileURLToPath } from 'node:url';

const defaultLiveCacheFile = fileURLToPath(
  new URL('../.cache/live-search-cache.json', import.meta.url),
);

function positiveNumberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function booleanFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function normalizeSwaggerRoutePrefix(value: string | undefined): string {
  const raw = (value ?? '/docs').trim();
  if (raw === '') return '/docs';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function corsOriginFromEnv(value: string | undefined): boolean | string | string[] {
  if (value == null || value.trim() === '') return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) return true;
  if (origins.length === 1) return origins[0]!;
  return origins;
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
    /** Timeout por retailer en comparación de líneas. */
    retailerTimeoutMs: positiveNumberFromEnv(process.env.RETAILER_TIMEOUT_MS, 8000),
    /** Activación de OpenAPI/Swagger UI. */
    swaggerEnabled: booleanFromEnv(process.env.SWAGGER_ENABLED, true),
    /** Ruta donde se expone Swagger UI. */
    swaggerRoutePrefix: normalizeSwaggerRoutePrefix(process.env.SWAGGER_ROUTE_PREFIX),
    /** URL pública de la API para la sección servers de OpenAPI (opcional). */
    apiPublicUrl: process.env.API_PUBLIC_URL,
    /** CORS: `true` (default), `false` o lista CSV de orígenes permitidos. */
    corsOrigin: corsOriginFromEnv(process.env.CORS_ORIGIN),
  };
}
