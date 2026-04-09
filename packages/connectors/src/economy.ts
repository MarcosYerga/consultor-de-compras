import type { SearchHit } from '@consultor/api-types';
import { parseQuantityFromHitText } from './parse-product-quantity.js';

type ComparableBasis = 'PER_KG' | 'PER_L' | 'PER_UNIT';

function comparableEconomyMetric(hit: SearchHit): { score: number; basis: ComparableBasis } | null {
  if (hit.net_quantity_g != null && hit.net_quantity_g > 0) {
    return {
      score: hit.pack_price_eur / (hit.net_quantity_g / 1000),
      basis: 'PER_KG',
    };
  }
  if (hit.volume_ml != null && hit.volume_ml > 0) {
    return {
      score: hit.pack_price_eur / (hit.volume_ml / 1000),
      basis: 'PER_L',
    };
  }

  const fromText = parseQuantityFromHitText(hit);
  if (fromText?.net_g != null && fromText.net_g > 0) {
    return {
      score: hit.pack_price_eur / (fromText.net_g / 1000),
      basis: 'PER_KG',
    };
  }
  if (fromText?.ml != null && fromText.ml > 0) {
    return {
      score: hit.pack_price_eur / (fromText.ml / 1000),
      basis: 'PER_L',
    };
  }

  if (hit.price_per_unit_eur != null && hit.unit_basis != null && hit.unit_basis !== 'UNKNOWN') {
    if (hit.unit_basis === 'PER_KG' || hit.unit_basis === 'PER_L' || hit.unit_basis === 'PER_UNIT') {
      return { score: hit.price_per_unit_eur, basis: hit.unit_basis };
    }
  }

  return null;
}

/**
 * Detecta si el usuario pidió una cantidad concreta (gramos, kg, litros, formato multipack).
 * En ese caso se mantiene el criterio clásico: menor precio del pack entre candidatos relevantes.
 */
export function lineSpecifiesQuantity(normalizedLine: string): boolean {
  const s = normalizedLine.trim();
  if (/\d+(?:[.,]\d+)?\s*(?:g|gr|gramos|kg|mg)\b/u.test(s)) return true;
  if (/\d+(?:[.,]\d+)?\s*(?:ml|l|litro|litros|cl)\b/u.test(s)) return true;
  if (/\d\s*x\s*\d|\d+x\d+/u.test(s)) return true;
  if (/\bpack\s+\d/u.test(s)) return true;
  return false;
}

/**
 * Métrica única para comparar “economía”: menor valor = mejor.
 * - Peso neto: EUR/kg (precio del pack / kg netos).
 * - Líquido: EUR/L.
 * - Por unidad: EUR/unidad o precio del pack si no hay más datos.
 * `null` si no hay datos para comparar por unidad (se usa entonces precio del pack).
 *
 * Si no hay `net_quantity_g` / `volume_ml` en el DTO, se intenta leer cantidad del **nombre** o de
 * `pack_size_label` (muchos conectores solo rellenan texto).
 */
export function comparableEconomyScore(hit: SearchHit): number | null {
  return comparableEconomyMetric(hit)?.score ?? null;
}

/** Ordena dos hits: economía si aplica, si no precio de pack. */
export function compareHitsForShoppingPreference(a: SearchHit, b: SearchHit, preferEconomy: boolean): number {
  if (preferEconomy) {
    const ea = comparableEconomyMetric(a);
    const eb = comparableEconomyMetric(b);
    if (ea != null && eb != null) {
      if (ea.basis === eb.basis) return ea.score - eb.score;
    } else {
      if (ea != null) return -1;
      if (eb != null) return 1;
    }
  }
  return a.pack_price_eur - b.pack_price_eur;
}
