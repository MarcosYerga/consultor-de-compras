import type { SearchHit, UnitBasis } from '@consultor/api-types';
import type { LidlSearchItem } from './lidl-types.js';

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
 * Convierte un ítem de la API de búsqueda Lidl al modelo canónico `SearchHit`.
 */
export function mapLidlItemToSearchHit(item: LidlSearchItem, origin: string): SearchHit | null {
  if (item.type !== 'product' && item.resultClass !== 'product') return null;
  const data = item.gridbox?.data;
  if (!data) return null;

  const title =
    data.fullTitle?.trim() ||
    data.keyfacts?.fullTitle?.trim() ||
    data.keyfacts?.title?.trim() ||
    '';
  if (!title) return null;

  const rawPrice = data.price?.price;
  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) return null;

  const path = data.canonicalUrl || data.canonicalPath || '';
  if (!path) return null;

  const productUrl = joinUrl(origin, path);
  const basis = inferBasisFromTitle(title);

  return {
    title,
    pack_price_eur: Math.round(rawPrice * 100) / 100,
    price_per_unit_eur: undefined,
    unit_basis: basis,
    product_url: productUrl,
    pack_size_label: undefined,
    net_quantity_g: undefined,
    volume_ml: undefined,
    offer_hint: undefined,
  };
}

export function mapLidlSearchResponseToHits(
  response: unknown,
  origin: string,
  maxHits: number,
): SearchHit[] {
  if (!response || typeof response !== 'object') return [];
  const items = (response as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const hits: SearchHit[] = [];
  for (const raw of items) {
    const hit = mapLidlItemToSearchHit(raw as LidlSearchItem, origin);
    if (hit) hits.push(hit);
    if (hits.length >= maxHits) break;
  }
  return hits;
}
