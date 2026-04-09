import type { SearchHit, UnitBasis } from '@consultor/api-types';

function joinUrl(origin: string, path: string): string {
  if (path.startsWith('http')) return path;
  const base = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function inferBasisFromTitle(title: string): UnitBasis {
  const t = title.toLowerCase();
  if (/\b(ml|litro|litros|\d\s*l)\b/u.test(t)) return 'PER_L';
  if (/\b(g|gr|gramos|kg)\b/u.test(t)) return 'PER_KG';
  return 'UNKNOWN';
}

/**
 * Extrae productos del HTML de `/q/search` cuando la API JSON devuelve 401 fuera del navegador.
 * El HTML empaqueta datos con entidades `&quot;` (patrón observado en producción).
 */
export function parseLidlSearchHtmlToHits(html: string, origin: string, maxHits: number): SearchHit[] {
  const marker = '&quot;fullTitle&quot;:&quot;';
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  let pos = 0;

  while (pos < html.length && hits.length < maxHits) {
    const i = html.indexOf(marker, pos);
    if (i === -1) break;

    const chunk = html.slice(Math.max(0, i - 2500), i + 8000);
    const titleM = chunk.match(/&quot;fullTitle&quot;:&quot;([^&]*)(&quot;)/);
    const pathMatches = chunk.match(/&quot;canonicalUrl&quot;:&quot;(\/p\/[^&]+)&quot;/g);
    const priceM = chunk.match(/&quot;price&quot;:([\d.]+),&quot;showEndDate&quot;/);

    if (titleM && pathMatches && priceM) {
      const titleRaw = titleM[1];
      const priceStr = priceM[1];
      if (titleRaw === undefined || priceStr === undefined) {
        pos = i + marker.length;
        continue;
      }
      const title = titleRaw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const pathMatch = pathMatches[pathMatches.length - 1]?.match(/(\/p\/[^&]+)/);
      const lastPath = pathMatch?.[1];
      const rawPrice = Number(priceStr);
      if (!lastPath) {
        pos = i + marker.length;
        continue;
      }
      if (title.trim() && Number.isFinite(rawPrice) && rawPrice > 0 && !seen.has(lastPath)) {
        seen.add(lastPath);
        hits.push({
          title: title.trim(),
          pack_price_eur: Math.round(rawPrice * 100) / 100,
          price_per_unit_eur: undefined,
          unit_basis: inferBasisFromTitle(title),
          product_url: joinUrl(origin, lastPath),
          pack_size_label: undefined,
          net_quantity_g: undefined,
          volume_ml: undefined,
          offer_hint: undefined,
        });
      }
    }
    pos = i + marker.length;
  }

  return hits;
}
