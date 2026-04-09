import { describe, expect, it } from '@jest/globals';
import type { ItemComparison, PerRetailerMap } from '@consultor/api-types';
import { computeBasketSummary } from './basket-summary.js';

function ok(price: number): PerRetailerMap['eroski'] {
  return {
    label: 'x',
    pack_size_label: null,
    net_quantity_g: null,
    pack_price_eur: price,
    unit: null,
    unit_price_eur: null,
    product_url: 'https://example.com/p',
    match_confidence: 0.9,
    source: 'live',
    error: null,
  };
}

function err(): PerRetailerMap['eroski'] {
  return {
    label: null,
    pack_size_label: null,
    net_quantity_g: null,
    pack_price_eur: null,
    unit: null,
    unit_price_eur: null,
    product_url: null,
    match_confidence: null,
    source: null,
    error: 'No disponible',
  };
}

describe('computeBasketSummary', () => {
  it('elige la cadena más barata con cesta completa', () => {
    const items: ItemComparison[] = [
      {
        line: 'a',
        normalized_line: 'a',
        cheapest_overall: null,
        per_retailer: {
          eroski: ok(5),
          ahorramas: ok(5),
          carrefour: ok(1),
          dia: ok(5),
          el_corte_ingles: ok(5),
          lidl: ok(5),
          mercadona: ok(5),
        },
      },
      {
        line: 'b',
        normalized_line: 'b',
        cheapest_overall: null,
        per_retailer: {
          eroski: ok(5),
          ahorramas: ok(5),
          carrefour: ok(1),
          dia: ok(5),
          el_corte_ingles: ok(5),
          lidl: ok(5),
          mercadona: ok(5),
        },
      },
    ];
    const b = computeBasketSummary(items);
    expect(b.cheapest_full_basket).toBe('carrefour');
    expect(b.by_retailer.find((r) => r.retailer === 'carrefour')!.total_eur).toBe(2);
  });

  it('sin cesta completa, cheapest_full_basket es null', () => {
    const items: ItemComparison[] = [
      {
        line: 'a',
        normalized_line: 'a',
        cheapest_overall: null,
        per_retailer: {
          eroski: ok(1),
          ahorramas: ok(1),
          carrefour: ok(1),
          dia: ok(1),
          el_corte_ingles: ok(1),
          lidl: ok(1),
          mercadona: ok(1),
        },
      },
      {
        line: 'b',
        normalized_line: 'b',
        cheapest_overall: null,
        per_retailer: {
          eroski: err(),
          ahorramas: err(),
          carrefour: err(),
          dia: err(),
          el_corte_ingles: err(),
          lidl: err(),
          mercadona: err(),
        },
      },
    ];
    const b = computeBasketSummary(items);
    expect(b.cheapest_full_basket).toBeNull();
  });
});
