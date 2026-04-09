import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapLidlItemToSearchHit, mapLidlSearchResponseToHits } from './lidl-mapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('mapLidlItemToSearchHit', () => {
  it('mapea producto con fullTitle y canonicalUrl', () => {
    const hit = mapLidlItemToSearchHit(
      {
        type: 'product',
        resultClass: 'product',
        gridbox: {
          data: {
            fullTitle: 'Leche entera 1 l',
            canonicalUrl: '/p/leche/p1',
            price: { price: 0.85, currencyCode: 'EUR' },
          },
        },
      },
      'https://www.lidl.es',
    );
    expect(hit).not.toBeNull();
    expect(hit!.title).toBe('Leche entera 1 l');
    expect(hit!.pack_price_eur).toBe(0.85);
    expect(hit!.product_url).toBe('https://www.lidl.es/p/leche/p1');
  });

  it('parsea fixture JSON de ejemplo', () => {
    const path = join(__dirname, 'fixtures', 'search-response.sample.json');
    const json = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const hits = mapLidlSearchResponseToHits(json, 'https://www.lidl.es', 30);
    expect(hits.length).toBe(2);
    expect(hits[0]!.title).toContain('Leche');
    expect(hits[1]!.product_url).toContain('lidl.es');
  });
});
