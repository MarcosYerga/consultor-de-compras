import type { SearchHit, UnitBasis } from '@consultor/api-types';
import type { MercadonaProductJson } from './mercadona-types.js';

function parseMoney(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number.parseFloat(String(value).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

function inferUnitBasis(pi: MercadonaProductJson['price_instructions']): UnitBasis {
  const rf = pi?.reference_format?.toLowerCase() ?? '';
  const sf = pi?.size_format?.toLowerCase() ?? '';
  if (rf === 'l' || sf === 'l') return 'PER_L';
  if (rf === 'kg' || sf === 'kg') return 'PER_KG';
  if (rf === 'ud' || sf === 'ud') return 'PER_UNIT';
  return 'UNKNOWN';
}

/**
 * Convierte un producto de la API Mercadona al modelo canónico `SearchHit`.
 */
export function mapMercadonaProductToSearchHit(p: MercadonaProductJson): SearchHit | null {
  const pi = p.price_instructions;
  if (!pi) return null;

  const unitPrice = parseMoney(pi.unit_price);
  const bulkPrice = parseMoney(pi.bulk_price);
  const unitSize = pi.unit_size ?? null;

  /** Precio del envase (lo que suele compararse en ticket). */
  let packPrice: number | null = null;
  if (unitPrice != null && unitPrice > 0) {
    packPrice = unitPrice;
  } else if (bulkPrice != null && unitSize != null && unitSize > 0) {
    packPrice = bulkPrice * unitSize;
  } else if (bulkPrice != null) {
    packPrice = bulkPrice;
  }

  if (packPrice == null || packPrice <= 0) return null;

  /** Precio por unidad de referencia (€/kg o €/L) cuando se puede derivar. */
  let pricePerUnit: number | undefined;
  if (bulkPrice != null && bulkPrice > 0) {
    pricePerUnit = bulkPrice;
  } else if (unitPrice != null && unitSize != null && unitSize > 0) {
    pricePerUnit = unitPrice / unitSize;
  }

  const basis = inferUnitBasis(pi);
  const sizeBits: string[] = [];
  if (unitSize != null) sizeBits.push(String(unitSize));
  if (pi.size_format) sizeBits.push(pi.size_format);
  if (pi.reference_format) sizeBits.push(pi.reference_format);
  const packSizeLabel = sizeBits.length > 0 ? sizeBits.join(' ').replace(/\s+/g, ' ').trim() : undefined;

  let netQuantityG: number | undefined;
  if (unitSize != null && (basis === 'PER_KG' || pi.reference_format?.toLowerCase() === 'kg')) {
    netQuantityG = unitSize * 1000;
  }

  let volumeMl: number | undefined;
  if (unitSize != null && (basis === 'PER_L' || pi.reference_format?.toLowerCase() === 'l')) {
    volumeMl = unitSize * 1000;
  }

  return {
    title: p.display_name,
    pack_price_eur: Math.round(packPrice * 100) / 100,
    price_per_unit_eur: pricePerUnit != null ? Math.round(pricePerUnit * 10000) / 10000 : undefined,
    unit_basis: basis,
    product_url: p.share_url,
    pack_size_label: packSizeLabel,
    net_quantity_g: netQuantityG,
    volume_ml: volumeMl,
    offer_hint: undefined,
  };
}
