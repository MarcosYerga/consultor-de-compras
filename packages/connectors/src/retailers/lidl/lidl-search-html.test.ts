import { describe, expect, it } from 'vitest';
import { parseLidlSearchHtmlToHits } from './lidl-search-html.js';

const SAMPLE = `...&quot;canonicalUrl&quot;:&quot;/p/test-leche/p1001&quot;,&quot;category&quot;:&quot;Lácteos&quot;,&quot;fullTitle&quot;:&quot;Leche entera 1 l&quot;,&quot;havingPrice&quot;:true,&quot;price&quot;:{&quot;currencyCode&quot;:&quot;EUR&quot;,&quot;packaging&quot;:{},&quot;price&quot;:0.89,&quot;showEndDate&quot;:false,&quot;specialTaxes&quot;:[]...`;

describe('parseLidlSearchHtmlToHits', () => {
  it('extrae título, path y precio del HTML con &quot;', () => {
    const hits = parseLidlSearchHtmlToHits(SAMPLE, 'https://www.lidl.es', 10);
    expect(hits.length).toBe(1);
    expect(hits[0]!.title).toBe('Leche entera 1 l');
    expect(hits[0]!.pack_price_eur).toBe(0.89);
    expect(hits[0]!.product_url).toBe('https://www.lidl.es/p/test-leche/p1001');
  });

  it('deduplica por canonicalUrl', () => {
    const dup = `${SAMPLE}${SAMPLE}`;
    const hits = parseLidlSearchHtmlToHits(dup, 'https://www.lidl.es', 10);
    expect(hits.length).toBe(1);
  });
});
