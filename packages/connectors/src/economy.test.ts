import { describe, expect, it } from 'vitest';
import type { SearchHit } from '@consultor/api-types';
import {
  comparableEconomyScore,
  compareHitsForShoppingPreference,
  lineSpecifiesQuantity,
} from './economy.js';

describe('lineSpecifiesQuantity', () => {
  it('detecta gramos, litros y multipack', () => {
    expect(lineSpecifiesQuantity('garbanzos 500 g')).toBe(true);
    expect(lineSpecifiesQuantity('leche 1 l')).toBe(true);
    expect(lineSpecifiesQuantity('yogur 6x125g')).toBe(true);
    expect(lineSpecifiesQuantity('garbanzos cocidos')).toBe(false);
    expect(lineSpecifiesQuantity('aceite girasol')).toBe(false);
  });
});

describe('comparableEconomyScore', () => {
  it('calcula EUR/kg desde pack y peso neto', () => {
    const hit: SearchHit = {
      title: 'x',
      pack_price_eur: 5,
      net_quantity_g: 500,
      product_url: 'https://x',
      unit_basis: 'PER_KG',
    };
    expect(comparableEconomyScore(hit)).toBe(10);
  });

  it('infiere EUR/kg desde el título si no hay net_quantity_g', () => {
    const hit: SearchHit = {
      title: 'Garbanzos lata 400g',
      pack_price_eur: 5,
      product_url: 'https://x',
      unit_basis: 'UNKNOWN',
    };
    expect(comparableEconomyScore(hit)).toBeCloseTo(12.5, 5);
  });
});

describe('compareHitsForShoppingPreference', () => {
  it('sin economía preferida usa precio de pack', () => {
    const a: SearchHit = {
      title: 'a',
      pack_price_eur: 4,
      net_quantity_g: 200,
      product_url: 'https://a',
      unit_basis: 'PER_KG',
    };
    const b: SearchHit = {
      title: 'b',
      pack_price_eur: 5,
      net_quantity_g: 500,
      product_url: 'https://b',
      unit_basis: 'PER_KG',
    };
    expect(compareHitsForShoppingPreference(a, b, false)).toBeLessThan(0);
  });

  it('con economía elige menor €/kg aunque el pack sea más caro', () => {
    const small: SearchHit = {
      title: 'a',
      pack_price_eur: 4,
      net_quantity_g: 200,
      product_url: 'https://a',
      unit_basis: 'PER_KG',
    };
    const big: SearchHit = {
      title: 'b',
      pack_price_eur: 5,
      net_quantity_g: 500,
      product_url: 'https://b',
      unit_basis: 'PER_KG',
    };
    expect(compareHitsForShoppingPreference(small, big, true)).toBeGreaterThan(0);
  });

  it('no mezcla bases incompatibles (€/kg vs €/L) y cae a precio de pack', () => {
    const perKg: SearchHit = {
      title: 'producto kg',
      pack_price_eur: 2,
      price_per_unit_eur: 1,
      product_url: 'https://a',
      unit_basis: 'PER_KG',
    };
    const perL: SearchHit = {
      title: 'producto l',
      pack_price_eur: 2,
      price_per_unit_eur: 0.8,
      product_url: 'https://b',
      unit_basis: 'PER_L',
    };
    expect(compareHitsForShoppingPreference(perKg, perL, true)).toBe(0);
  });
});
