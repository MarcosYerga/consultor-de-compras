/**
 * Extrae un precio en EUR desde objetos heterogéneos (APIs retail / JSON embebido).
 */
export function extractNumericPriceFromRecord(o: Record<string, unknown>): number | null {
  const direct = [o.price, o.unitPrice, o.finalPrice, o.amount, o.salePrice, o.currentPrice];
  for (const c of direct) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0 && c < 100_000) return c;
    if (c && typeof c === 'object' && 'value' in c) {
      const v = (c as { value?: unknown }).value;
      if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 100_000) return v;
    }
  }
  if (typeof o.formattedPrice === 'string') {
    const m = o.formattedPrice.replace(/\s/g, ' ').replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0 && n < 100_000) return n;
    }
  }
  if (typeof o.priceText === 'string') {
    const m = o.priceText.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0 && n < 100_000) return n;
    }
  }
  return null;
}
