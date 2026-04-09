import type { SearchHit } from '@consultor/api-types';
import { compareHitsForShoppingPreference, lineSpecifiesQuantity } from './economy.js';
import { titleSimilarity } from './similarity.js';
import { normalizeLine } from './normalize.js';

const RELEVANCE_THRESHOLD = 0.14;
const MIN_ANY_MATCH = 0.07;

export type MatchedHit = {
  hit: SearchHit;
  match_confidence: number;
};

function expectedBasisFromLine(normalizedLine: string): 'PER_L' | 'PER_KG' | null {
  if (/\d+(?:[.,]\d+)?\s*(?:ml|l|litro|litros|cl)\b/u.test(normalizedLine)) return 'PER_L';
  if (/\d+(?:[.,]\d+)?\s*(?:g|gr|gramos|kg|mg)\b/u.test(normalizedLine)) return 'PER_KG';
  return null;
}

function hasMilkVariantConflict(normalizedLine: string, title: string): boolean {
  const t = normalizeLine(title);
  const asksMilk = /\bleche\b/u.test(normalizedLine);
  if (!asksMilk) return false;

  const asksEntera = /\bentera\b/u.test(normalizedLine);
  const asksDesnatada = /\bdesnatad[ao]s?\b/u.test(normalizedLine);
  const asksSemi = /\bsemi\s*desnatad[ao]s?\b|\bsemidesnatad[ao]s?\b/u.test(normalizedLine);

  const isEntera = /\bentera\b/u.test(t);
  const isDesnatada = /\bdesnatad[ao]s?\b/u.test(t);
  const isSemi = /\bsemi\s*desnatad[ao]s?\b|\bsemidesnatad[ao]s?\b/u.test(t);

  if (asksEntera && (isDesnatada || isSemi)) return true;
  if (asksDesnatada && (isEntera || isSemi)) return true;
  if (asksSemi && (isEntera || isDesnatada)) return true;

  return false;
}

function hasOilTypeConflict(normalizedLine: string, title: string): boolean {
  const asksOil = /\baceite\b/u.test(normalizedLine);
  if (!asksOil) return false;

  const t = normalizeLine(title);
  const asksOlive = /\boliva\b/u.test(normalizedLine);
  const asksSunflower = /\bgirasol\b/u.test(normalizedLine);

  const isOlive = /\boliva\b/u.test(t);
  const isSunflower = /\bgirasol\b/u.test(t);

  if (asksOlive && !isOlive) return true;
  if (asksSunflower && !isSunflower) return true;

  return false;
}

/**
 * Multimarca por cadena: entre hits relevantes, el mejor candidato según la línea:
 * - sin cantidad explícita: mejor **economía** (€/kg, €/L…) cuando hay datos;
 * - con cantidad explícita: menor precio del pack (comportamiento anterior).
 */
export function pickRepresentativeHit(
  normalizedLine: string,
  hits: SearchHit[],
): MatchedHit | null {
  if (hits.length === 0) return null;

  const preferEconomy = !lineSpecifiesQuantity(normalizedLine);

  const scored = hits.map((hit) => ({
    hit,
    sim: titleSimilarity(normalizedLine, hit.title),
  }));

  const maxSim = Math.max(...scored.map((s) => s.sim));
  if (maxSim < MIN_ANY_MATCH) return null;

  const relevant = scored.filter((s) => s.sim >= RELEVANCE_THRESHOLD);
  let pool = relevant.length > 0 ? relevant : [scored.sort((a, b) => b.sim - a.sim)[0]!];

  pool = pool.filter(
    (s) =>
      !hasMilkVariantConflict(normalizedLine, s.hit.title) &&
      !hasOilTypeConflict(normalizedLine, s.hit.title),
  );
  if (pool.length === 0) return null;

  const expectedBasis = expectedBasisFromLine(normalizedLine);
  if (expectedBasis) {
    const byBasis = pool.filter((s) => s.hit.unit_basis === expectedBasis);
    if (byBasis.length > 0) pool = byBasis;
  }

  const bestPrice = pool
    .slice()
    .sort((a, b) => compareHitsForShoppingPreference(a.hit, b.hit, preferEconomy))[0]!;
  const lowRelevance = bestPrice.sim < RELEVANCE_THRESHOLD;
  const confidence = lowRelevance
    ? Math.max(0.25, Math.min(0.55, bestPrice.sim * 3))
    : Math.min(1, bestPrice.sim + 0.12);

  return { hit: bestPrice.hit, match_confidence: confidence };
}

/**
 * Aviso si el ganador global difiere mucho en peso neto respecto al segundo mejor.
 */
export function maybeFormatWarning(
  winnerNetG: number | undefined,
  runnerUpNetG: number | undefined,
): string | null {
  if (winnerNetG === undefined || runnerUpNetG === undefined) return null;
  const ratio = winnerNetG / runnerUpNetG;
  if (ratio < 0.75 || ratio > 1.35) {
    return 'Revisar: distinto tamaño de envase respecto a otras cadenas.';
  }
  return null;
}
