import { describe, expect, it } from '@jest/globals';
import { parseEroskiSearchHtml } from './eroski-parse-search.js';

const SNIPPET = `<a href="https://supermercado.eroski.es:443/es/productdetail/18672295-leche-test/" class="product-title-link" data-metrics="{&quot;event&quot;:&quot;select_item&quot;,&quot;ecommerce&quot;:{&quot;currency&quot;:&quot;EUR&quot;,&quot;items&quot;:[{&quot;price&quot;:1.15,&quot;item_name&quot;:&quot;Leche entera EROSKI 1 l&quot;,&quot;item_id&quot;:&quot;18672295&quot;}]}}">X</a>`;

describe('parseEroskiSearchHtml', () => {
  it('extrae hit desde data-metrics y normaliza URL', () => {
    const hits = parseEroskiSearchHtml(SNIPPET, 'https://supermercado.eroski.es', 10);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.title).toBe('Leche entera EROSKI 1 l');
    expect(hits[0]!.pack_price_eur).toBe(1.15);
    expect(hits[0]!.product_url).toBe(
      'https://supermercado.eroski.es/es/productdetail/18672295-leche-test/',
    );
  });

  it('deduplica por item_id', () => {
    const dup = `${SNIPPET}${SNIPPET}`;
    const hits = parseEroskiSearchHtml(dup, 'https://supermercado.eroski.es', 10);
    expect(hits).toHaveLength(1);
  });
});
