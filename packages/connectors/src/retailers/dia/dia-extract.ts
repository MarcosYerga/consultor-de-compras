import { load } from 'cheerio';
import type { DiaSearchProduct } from './dia-types.js';

/**
 * Extrae `search_items` del JSON embebido en la página SSR (`script#vike_pageContext`).
 */
export function extractDiaSearchItemsFromHtml(html: string): DiaSearchProduct[] {
  const $ = load(html);
  const raw = $('#vike_pageContext').first().html();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }

  const items = findSearchItemsArray(parsed);
  if (!items) return [];

  return items.filter((x): x is DiaSearchProduct => x != null && typeof x === 'object');
}

function findSearchItemsArray(root: unknown): DiaSearchProduct[] | undefined {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined) continue;
    if (typeof cur !== 'object') continue;

    if (Array.isArray(cur)) {
      for (const x of cur) stack.push(x);
      continue;
    }

    const o = cur as Record<string, unknown>;
    if (Array.isArray(o.search_items) && o.search_items.length > 0) {
      return o.search_items as DiaSearchProduct[];
    }

    for (const v of Object.values(o)) {
      stack.push(v);
    }
  }
  return undefined;
}
