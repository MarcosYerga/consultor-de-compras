import { describe, expect, it } from '@jest/globals';
import { parseQuantityFromProductText } from './parse-product-quantity.js';

describe('parseQuantityFromProductText', () => {
  it('lee gramos y kg en el nombre', () => {
    expect(parseQuantityFromProductText('Garbanzos cocidos lata 400 g')).toEqual({ net_g: 400 });
    expect(parseQuantityFromProductText('Arroz 1 kg')).toEqual({ net_g: 1000 });
  });

  it('lee litros y ml', () => {
    expect(parseQuantityFromProductText('Leche entera 1 l')).toEqual({ ml: 1000 });
    expect(parseQuantityFromProductText('Bebida 500 ml')).toEqual({ ml: 500 });
    expect(parseQuantityFromProductText('Cerveza 33 cl')).toEqual({ ml: 330 });
  });

  it('lee multipack 6×90 g', () => {
    expect(parseQuantityFromProductText('Yogur 6x125g')).toEqual({ net_g: 750 });
  });

  it('lee multipack en litros', () => {
    expect(parseQuantityFromProductText('Leche pack 6x1l')).toEqual({ ml: 6000 });
    expect(parseQuantityFromProductText('Agua 6 x 1 l')).toEqual({ ml: 6000 });
  });

  it('lee 1l sin espacio', () => {
    expect(parseQuantityFromProductText('Aceite girasol 1l')).toEqual({ ml: 1000 });
  });
});
