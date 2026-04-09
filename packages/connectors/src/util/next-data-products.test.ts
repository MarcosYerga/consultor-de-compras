import { describe, expect, it } from 'vitest';
import { parseNextDataSearchHtml } from './next-data-products.js';

const html = `<!DOCTYPE html>
<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"data":{"items":[{"name":"Leche 1l","price":0.99,"url":"/p/1"}]}}}}</script>
</body></html>`;

describe('parseNextDataSearchHtml', () => {
  it('extrae productos de __NEXT_DATA__', () => {
    const hits = parseNextDataSearchHtml(html, 'https://www.example.com', 10);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.title).toBe('Leche 1l');
    expect(hits[0]!.pack_price_eur).toBe(0.99);
    expect(hits[0]!.product_url).toBe('https://www.example.com/p/1');
  });
});
