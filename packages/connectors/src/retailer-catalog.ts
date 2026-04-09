import type { RetailerId, RetailerInfo } from '@consultor/api-types';

const CATALOG: Record<RetailerId, string> = {
  ahorramas: 'Ahorramas',
  carrefour: 'Carrefour',
  dia: 'Dia',
  el_corte_ingles: 'El Corte Inglés',
  eroski: 'Eroski',
  lidl: 'Lidl',
  mercadona: 'Mercadona',
};

export const RETAILER_ORDER: RetailerId[] = [
  'ahorramas',
  'carrefour',
  'dia',
  'el_corte_ingles',
  'eroski',
  'lidl',
  'mercadona',
];

export function listRetailers(): RetailerInfo[] {
  return RETAILER_ORDER.map((id) => ({ id, name: CATALOG[id] }));
}
