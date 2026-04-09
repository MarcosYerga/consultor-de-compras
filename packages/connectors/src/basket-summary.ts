import type { BasketSummary, ItemComparison, RetailerId } from '@consultor/api-types';
import { RETAILER_ORDER } from './retailer-catalog.js';

/**
 * Suma precios por cadena sobre los mismos resultados por ítem (§2.1 biblia: comparativa de cesta).
 */
export function computeBasketSummary(items: ItemComparison[]): BasketSummary {
  const lines_total = items.length;

  const rows = RETAILER_ORDER.map((retailer) => {
    let sum = 0;
    let lines_included = 0;
    for (const item of items) {
      const cell = item.per_retailer[retailer];
      if (cell.error === null && cell.pack_price_eur !== null) {
        sum += cell.pack_price_eur;
        lines_included += 1;
      }
    }
    const total_eur = Math.round(sum * 100) / 100;
    const complete = lines_total > 0 && lines_included === lines_total;
    return { retailer, total_eur, lines_included, lines_total, complete };
  });

  const by_retailer = [...rows].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    return a.total_eur - b.total_eur;
  });

  const completeRows = rows.filter((r) => r.complete);
  let cheapest_full_basket: RetailerId | null = null;
  if (completeRows.length > 0) {
    completeRows.sort((a, b) => a.total_eur - b.total_eur);
    cheapest_full_basket = completeRows[0]!.retailer;
  }

  return {
    by_retailer,
    cheapest_full_basket,
  };
}
