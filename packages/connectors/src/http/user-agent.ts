/**
 * User-Agent identificable para peticiones HTTP (cumplimiento §3.2 biblia).
 * Personaliza con CONNECTOR_USER_AGENT en el servidor si lo necesitas.
 */
export const DEFAULT_CONNECTOR_USER_AGENT =
  'ConsultorDeCompras/1.0 (+https://github.com/MarcosYerga/consultor-de-compras; sin uso comercial automatizado masivo)';

export function resolveUserAgent(override?: string): string {
  const fromEnv =
    typeof process === 'undefined' ? undefined : process.env.CONNECTOR_USER_AGENT;
  return override ?? fromEnv ?? DEFAULT_CONNECTOR_USER_AGENT;
}
