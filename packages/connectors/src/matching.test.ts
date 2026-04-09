import { describe, expect, it } from 'vitest';
import type { SearchHit } from '@consultor/api-types';
import { pickRepresentativeHit } from './matching.js';

const baseHit = (title: string, price: number): SearchHit => ({
  title,
  pack_price_eur: price,
  product_url: 'https://example.com/p/1',
  unit_basis: 'PER_KG',
  price_per_unit_eur: 2,
  net_quantity_g: 500,
});

describe('pickRepresentativeHit', () => {
  it('elige el más barato entre hits relevantes', () => {
    const line = 'garbanzos cocidos';
    const hits = [
      baseHit('Garbanzos cocidos en salsa', 1.2),
      baseHit('Garbanzos cocidos lata', 0.9),
    ];
    const r = pickRepresentativeHit(line, hits);
    expect(r?.hit.pack_price_eur).toBe(0.9);
  });

  it('sin cantidad en la línea prioriza mejor €/kg (pack más caro puede ganar)', () => {
    const hits: SearchHit[] = [
      {
        title: 'Garbanzos cocidos lata 200g',
        pack_price_eur: 4,
        net_quantity_g: 200,
        product_url: 'https://example.com/a',
        unit_basis: 'PER_KG',
      },
      {
        title: 'Garbanzos cocidos lata 500g',
        pack_price_eur: 5,
        net_quantity_g: 500,
        product_url: 'https://example.com/b',
        unit_basis: 'PER_KG',
      },
    ];
    const r = pickRepresentativeHit('garbanzos cocidos', hits);
    expect(r?.hit.pack_price_eur).toBe(5);
    expect(r?.hit.net_quantity_g).toBe(500);
  });

  it('con cantidad en la línea mantiene el criterio por precio del pack', () => {
    const hits: SearchHit[] = [
      {
        title: 'Garbanzos cocidos lata 200g',
        pack_price_eur: 4,
        net_quantity_g: 200,
        product_url: 'https://example.com/a',
        unit_basis: 'PER_KG',
      },
      {
        title: 'Garbanzos cocidos lata 500g',
        pack_price_eur: 5,
        net_quantity_g: 500,
        product_url: 'https://example.com/b',
        unit_basis: 'PER_KG',
      },
    ];
    const r = pickRepresentativeHit('garbanzos cocidos 500g', hits);
    expect(r?.hit.pack_price_eur).toBe(4);
  });

  it('sin cantidad en la línea: usa peso solo en el título si no hay net_quantity_g', () => {
    const hits: SearchHit[] = [
      {
        title: 'Garbanzos cocidos lata 200 g',
        pack_price_eur: 4,
        product_url: 'https://example.com/a',
        unit_basis: 'UNKNOWN',
      },
      {
        title: 'Garbanzos cocidos lata 500 g',
        pack_price_eur: 5,
        product_url: 'https://example.com/b',
        unit_basis: 'UNKNOWN',
      },
    ];
    const r = pickRepresentativeHit('garbanzos cocidos', hits);
    expect(r?.hit.pack_price_eur).toBe(5);
  });

  it('si la línea pide litros, prioriza candidatos PER_L frente a PER_KG', () => {
    const hits: SearchHit[] = [
      {
        title: 'Tomate frito con aceite de oliva 350 g',
        pack_price_eur: 1.4,
        product_url: 'https://example.com/tomate',
        unit_basis: 'PER_KG',
      },
      {
        title: 'Aceite de oliva virgen extra 1 l',
        pack_price_eur: 4.5,
        product_url: 'https://example.com/aceite',
        unit_basis: 'PER_L',
      },
    ];

    const r = pickRepresentativeHit('aceite de oliva 1 l', hits);
    expect(r?.hit.title).toContain('Aceite de oliva');
    expect(r?.hit.unit_basis).toBe('PER_L');
  });

  it('evita conflicto leche entera vs desnatada', () => {
    const hits: SearchHit[] = [
      {
        title: 'Leche desnatada 1 l',
        pack_price_eur: 0.7,
        product_url: 'https://example.com/desnatada',
        unit_basis: 'PER_L',
      },
      {
        title: 'Leche entera 1 l',
        pack_price_eur: 0.9,
        product_url: 'https://example.com/entera',
        unit_basis: 'PER_L',
      },
    ];

    const r = pickRepresentativeHit('leche entera 1 l', hits);
    expect(r?.hit.title).toContain('entera');
  });

  it('evita confundir aceite de oliva con aceite de girasol', () => {
    const hits: SearchHit[] = [
      {
        title: 'Aceite de girasol refinado 0,2o 1 l',
        pack_price_eur: 1.7,
        product_url: 'https://example.com/girasol',
        unit_basis: 'PER_L',
      },
      {
        title: 'Aceite de oliva virgen 1 l',
        pack_price_eur: 4.5,
        product_url: 'https://example.com/oliva',
        unit_basis: 'PER_L',
      },
    ];

    const r = pickRepresentativeHit('aceite de oliva 1 l', hits);
    expect(r?.hit.title).toContain('oliva');
  });
});
