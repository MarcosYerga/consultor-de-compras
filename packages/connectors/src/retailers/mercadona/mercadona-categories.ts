import type { MercadonaCategoryNode, MercadonaProductJson } from './mercadona-types.js';
import { titleSimilarity } from '../../similarity.js';
import { normalizeLine } from '../../normalize.js';

export function flattenCategoryIndex(root: unknown): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const o = node as MercadonaCategoryNode;
    if (typeof o.id === 'number' && typeof o.name === 'string') {
      out.push({ id: o.id, name: o.name });
    }
    if (Array.isArray(o.categories)) {
      for (const c of o.categories) walk(c);
    }
    if (Array.isArray(o.results)) {
      for (const r of o.results) walk(r);
    }
  }

  walk(root);
  return out;
}

export function extractProductsDeep(node: unknown): MercadonaProductJson[] {
  const out: MercadonaProductJson[] = [];

  function walk(n: unknown): void {
    if (!n || typeof n !== 'object') return;
    const o = n as MercadonaCategoryNode;
    if (Array.isArray(o.products)) {
      for (const p of o.products) {
        if (p && typeof p === 'object' && 'display_name' in p && 'id' in p) {
          out.push(p as MercadonaProductJson);
        }
      }
    }
    if (Array.isArray(o.categories)) {
      for (const c of o.categories) walk(c);
    }
  }

  walk(node);
  return out;
}

/**
 * Elige IDs de categoría más prometedoras para acotar peticiones (no hay búsqueda global en API).
 */
export function pickCategoryIdsForQuery(
  normalizedQuery: string,
  categories: { id: number; name: string }[],
  limit: number,
): number[] {
  const scored = categories
    .map((c) => ({
      id: c.id,
      score: Math.max(titleSimilarity(normalizedQuery, c.name), titleSimilarity(normalizedQuery, normalizeLine(c.name))),
    }))
    .sort((a, b) => b.score - a.score);

  const seen = new Set<number>();
  const picked: number[] = [];
  for (const s of scored) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    picked.push(s.id);
    if (picked.length >= limit) break;
  }

  if (picked.length === 0 && categories.length > 0) {
    return categories.slice(0, Math.min(limit, categories.length)).map((c) => c.id);
  }

  return picked;
}
