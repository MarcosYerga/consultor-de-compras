import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAhorramasSearchHtml } from './ahorramas-parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('parseAhorramasSearchHtml', () => {
  it('parsea data-gtm-layer y enlace', () => {
    const path = join(__dirname, 'fixtures', 'search-ajax.sample.html');
    const html = readFileSync(path, 'utf8');
    const hits = parseAhorramasSearchHtml(html);
    expect(hits.length).toBe(1);
    expect(hits[0]!.title).toContain('Leche');
    expect(hits[0]!.pack_price_eur).toBe(0.84);
    expect(hits[0]!.product_url).toContain('ahorramas.com');
  });
});
