import { describe, expect, it } from 'vitest';
import { mapMercadonaProductToSearchHit } from './mercadona-mapper.js';

describe('mapMercadonaProductToSearchHit', () => {
  it('mapea un producto tipo leche 1 L', () => {
    const hit = mapMercadonaProductToSearchHit({
      id: '123',
      display_name: 'Leche entera Hacendado',
      share_url: 'https://tienda.mercadona.es/product/123/leche-entera',
      packaging: 'Brik',
      price_instructions: {
        bulk_price: '0.85',
        unit_price: '0.85',
        unit_size: 1,
        reference_format: 'L',
        size_format: 'l',
      },
    });
    expect(hit).not.toBeNull();
    expect(hit!.pack_price_eur).toBe(0.85);
    expect(hit!.unit_basis).toBe('PER_L');
    expect(hit!.product_url).toContain('tienda.mercadona.es');
  });

  it('mapea garrafa 5 L (precio total en unit_price)', () => {
    const hit = mapMercadonaProductToSearchHit({
      id: '4241',
      display_name: 'Aceite de oliva 0,4º Hacendado',
      share_url: 'https://tienda.mercadona.es/product/4241/aceite-oliva-04o-hacendado-garrafa',
      price_instructions: {
        bulk_price: '3.95',
        unit_price: '19.75',
        unit_size: 5,
        reference_format: 'L',
        size_format: 'l',
      },
    });
    expect(hit).not.toBeNull();
    expect(hit!.pack_price_eur).toBe(19.75);
  });
});
