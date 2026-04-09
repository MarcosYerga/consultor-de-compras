import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractDiaSearchItemsFromHtml } from './dia-extract.js';
import { mapDiaProductToSearchHit } from './dia-mapper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Dia extract + map', () => {
  it('extrae search_items del HTML de ejemplo', () => {
    const path = join(__dirname, 'fixtures', 'search-page.sample.html');
    const html = readFileSync(path, 'utf8');
    const items = extractDiaSearchItemsFromHtml(html);
    expect(items.length).toBe(2);
    const hit = mapDiaProductToSearchHit(items[0]!, 'https://www.dia.es');
    expect(hit).not.toBeNull();
    expect(hit!.pack_price_eur).toBe(0.88);
    expect(hit!.product_url).toContain('dia.es');
  });
});
