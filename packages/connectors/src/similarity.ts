import { tokenize } from './tokenize.js';

/**
 * Similitud tipo Jaccard entre tokens de consulta y título (0–1).
 */
export function titleSimilarity(normalizedQuery: string, productTitle: string): number {
  const a = new Set(tokenize(normalizedQuery));
  const b = new Set(tokenize(productTitle));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
