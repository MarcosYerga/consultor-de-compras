import { describe, expect, it } from '@jest/globals';
import { normalizeLine } from './normalize.js';

describe('normalizeLine', () => {
  it('unifica espacios y mayúsculas', () => {
    expect(normalizeLine('  Leche   entera  ')).toBe('leche entera');
  });

  it('normaliza litros', () => {
    expect(normalizeLine('Leche 1l')).toBe('leche 1 l');
  });

  it('quita acentos para matching', () => {
    expect(normalizeLine('Café')).toBe('cafe');
  });
});
