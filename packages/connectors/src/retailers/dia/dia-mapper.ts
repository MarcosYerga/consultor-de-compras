import type { SearchHit, UnitBasis } from '@consultor/api-types';
import type { DiaSearchProduct } from './dia-types.js';

function unitFromMeasure(mu: string | undefined): UnitBasis {
  const u = (mu ?? '').toUpperCase();
  if (u === 'LITRO' || u === 'L') return 'PER_L';
  if (u === 'KILO' || u === 'KG') return 'PER_KG';
  if (u === 'UNIDAD' || u === 'UD') return 'PER_UNIT';
  return 'UNKNOWN';
}

export function mapDiaProductToSearchHit(p: DiaSearchProduct, origin: string): SearchHit | null {
  const title = p.display_name?.trim();
  const path = p.url?.trim();
  const price = p.prices?.price;
  if (!title || !path || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  const productUrl = path.startsWith('http') ? path : `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  const mu = p.prices?.measure_unit;
  const basis = unitFromMeasure(mu);
  const ppu = p.prices?.price_per_unit;

  return {
    title,
    pack_price_eur: Math.round(price * 100) / 100,
    price_per_unit_eur:
      typeof ppu === 'number' && Number.isFinite(ppu) ? Math.round(ppu * 10000) / 10000 : undefined,
    unit_basis: basis,
    product_url: productUrl,
    pack_size_label: undefined,
    net_quantity_g: undefined,
    volume_ml: undefined,
    offer_hint: undefined,
  };
}
