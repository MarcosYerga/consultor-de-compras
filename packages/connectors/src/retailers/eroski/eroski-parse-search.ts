import type { SearchHit, UnitBasis } from '@consultor/api-types';

function decodeDataMetricsAttr(raw: string): string {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeProductUrl(href: string, origin: string): string {
  try {
    const u = new URL(href);
    const base = origin.replace(/\/$/, '');
    return `${base}${u.pathname}${u.search}`;
  } catch {
    const base = origin.replace(/\/$/, '');
    if (href.startsWith('/')) return `${base}${href}`;
    return href;
  }
}

function inferBasisFromTitle(title: string): UnitBasis {
  const t = title.toLowerCase();
  if (/\b(ml|litro|litros|\d\s*l)\b/u.test(t)) return 'PER_L';
  if (/\b(g|gr|gramos|kg)\b/u.test(t)) return 'PER_KG';
  return 'UNKNOWN';
}

type ParsedMetricsItem = {
  item_name: string;
  price: number;
  item_id?: string;
};

function parseMetricsJson(jsonStr: string): ParsedMetricsItem | null {
  try {
    const o = JSON.parse(jsonStr) as {
      ecommerce?: { items?: { price?: number; item_name?: string; item_id?: string }[] };
    };
    const item = o.ecommerce?.items?.[0];
    if (!item || typeof item.item_name !== 'string' || typeof item.price !== 'number') return null;
    if (!Number.isFinite(item.price) || item.price <= 0) return null;
    return {
      item_name: item.item_name,
      price: item.price,
      ...(item.item_id !== undefined ? { item_id: item.item_id } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Lista de `<a class="...product-title-link...">` con `data-metrics` (GA4) en resultados de búsqueda.
 */
function extractProductAnchors(html: string): { href: string; metricsRaw: string }[] {
  const out: { href: string; metricsRaw: string }[] = [];
  let pos = 0;
  while (true) {
    const i = html.indexOf('product-title-link', pos);
    if (i === -1) break;
    const aStart = html.lastIndexOf('<a', i);
    const aEnd = html.indexOf('>', i);
    if (aStart === -1 || aEnd === -1) {
      pos = i + 20;
      continue;
    }
    const tag = html.slice(aStart, aEnd + 1);
    const href = tag.match(/href="([^"]+)"/)?.[1];
    const metricsRaw = tag.match(/data-metrics="([^"]+)"/)?.[1];
    if (href && metricsRaw) out.push({ href, metricsRaw });
    pos = aEnd + 1;
  }
  return out;
}

/**
 * Parsea el HTML de `supermercado.eroski.es/es/search/results/?q=…`.
 */
export function parseEroskiSearchHtml(html: string, origin: string, maxHits: number): SearchHit[] {
  const anchors = extractProductAnchors(html);
  const seen = new Set<string>();
  const hits: SearchHit[] = [];

  for (const { href, metricsRaw } of anchors) {
    if (hits.length >= maxHits) break;
    const item = parseMetricsJson(decodeDataMetricsAttr(metricsRaw));
    if (!item) continue;
    const key = item.item_id ?? href;
    if (seen.has(key)) continue;
    seen.add(key);

    const title = item.item_name.trim();
    if (!title) continue;

    hits.push({
      title,
      pack_price_eur: Math.round(item.price * 100) / 100,
      price_per_unit_eur: undefined,
      unit_basis: inferBasisFromTitle(title),
      product_url: normalizeProductUrl(href, origin),
      pack_size_label: undefined,
      net_quantity_g: undefined,
      volume_ml: undefined,
      offer_hint: undefined,
    });
  }

  return hits;
}
