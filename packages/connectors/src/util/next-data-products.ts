import type { SearchHit, UnitBasis } from '@consultor/api-types';
import { extractNumericPriceFromRecord } from './price.js';

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

function pickUrl(o: Record<string, unknown>, origin: string): string | null {
  const u =
    (typeof o.url === 'string' && o.url) ||
    (typeof o.productUrl === 'string' && o.productUrl) ||
    (typeof o.permalink === 'string' && o.permalink) ||
    (typeof o.href === 'string' && o.href) ||
    (typeof o.link === 'string' && o.link);
  if (!u) return null;
  return joinUrl(origin, u);
}

function isProductish(x: unknown): x is Record<string, unknown> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const title =
    (typeof o.name === 'string' && o.name) ||
    (typeof o.title === 'string' && o.title) ||
    (typeof o.label === 'string' && o.label) ||
    (typeof o.productName === 'string' && o.productName);
  if (!title || title.trim().length < 2) return false;
  const p = extractNumericPriceFromRecord(o);
  return p !== null;
}

function mapRecordToSearchHit(o: Record<string, unknown>, origin: string): SearchHit | null {
  const titleRaw =
    (typeof o.name === 'string' && o.name) ||
    (typeof o.title === 'string' && o.title) ||
    (typeof o.label === 'string' && o.label) ||
    (typeof o.productName === 'string' && o.productName);
  if (!titleRaw) return null;
  const price = extractNumericPriceFromRecord(o);
  if (price === null) return null;
  const product_url = pickUrl(o, origin);
  if (!product_url) return null;
  const title = titleRaw.trim();
  return {
    title,
    pack_price_eur: Math.round(price * 100) / 100,
    price_per_unit_eur: undefined,
    unit_basis: inferBasisFromTitle(title),
    product_url,
    pack_size_label: undefined,
    net_quantity_g: undefined,
    volume_ml: undefined,
    offer_hint: undefined,
  };
}

function collectProductArrays(obj: unknown, depth: number, out: Record<string, unknown>[][]): void {
  if (depth > 14) return;
  if (Array.isArray(obj)) {
    const filtered = obj.filter(isProductish);
    if (filtered.length >= 1) {
      out.push(filtered);
    }
    for (const el of obj) collectProductArrays(el, depth + 1, out);
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj as object)) collectProductArrays(v, depth + 1, out);
  }
}

export function extractNextDataPayload(html: string): unknown | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * Recorre JSON arbitrario (p. ej. __NEXT_DATA__) y construye `SearchHit` desde objetos con nombre + precio + URL.
 */
export function searchHitsFromEmbeddedJson(root: unknown, origin: string, limit: number): SearchHit[] {
  const arrays: Record<string, unknown>[][] = [];
  collectProductArrays(root, 0, arrays);
  arrays.sort((a, b) => b.length - a.length);
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const arr of arrays) {
    for (const row of arr) {
      const hit = mapRecordToSearchHit(row, origin);
      if (!hit) continue;
      if (seen.has(hit.product_url)) continue;
      seen.add(hit.product_url);
      hits.push(hit);
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

/** HTML con `<script id="__NEXT_DATA__">` (Next.js) → `SearchHit`. */
export function parseNextDataSearchHtml(html: string, origin: string, limit: number): SearchHit[] {
  const payload = extractNextDataPayload(html);
  if (!payload) return [];
  return searchHitsFromEmbeddedJson(payload, origin, limit);
}
