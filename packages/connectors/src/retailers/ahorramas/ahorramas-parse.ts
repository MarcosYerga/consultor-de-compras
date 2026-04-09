import { load } from 'cheerio';
import type { SearchHit } from '@consultor/api-types';

const ORIGIN_DEFAULT = 'https://www.ahorramas.com';

/**
 * Parsea el HTML devuelto por Search-ShowAjax (Salesforce Commerce Cloud).
 */
export function parseAhorramasSearchHtml(html: string, origin: string = ORIGIN_DEFAULT): SearchHit[] {
  const $ = load(html);
  const base = origin.replace(/\/$/, '');
  const hits: SearchHit[] = [];

  $('div.product').each((_, el) => {
    const $el = $(el);
    const tile = $el.find('.product-tile[data-gtm-layer]').first();
    if (!tile.length) return;

    const rawLayer = tile.attr('data-gtm-layer');
    if (!rawLayer) return;

    let data: { name?: string; price?: string | number };
    try {
      data = JSON.parse(decodeURIComponent(rawLayer)) as { name?: string; price?: string | number };
    } catch {
      return;
    }

    const title = data.name?.trim();
    const priceRaw = data.price;
    const price =
      typeof priceRaw === 'number'
        ? priceRaw
        : Number.parseFloat(String(priceRaw ?? '').replace(',', '.').replace(/\s/g, ''));

    if (!title || !Number.isFinite(price) || price <= 0) return;

    const $link = $el
      .find('a.tile-link, a[href*="Product-Show"], a[href*="/p/"]')
      .first();
    const href = $link.attr('href')?.trim();
    if (!href) return;

    const productUrl = href.startsWith('http') ? href : `${base}${href.startsWith('/') ? href : `/${href}`}`;

    hits.push({
      title,
      pack_price_eur: Math.round(price * 100) / 100,
      unit_basis: 'UNKNOWN',
      product_url: productUrl,
    });
  });

  return hits;
}
