import type {
  CheapestOverall,
  CompareMode,
  CompareResponse,
  ItemComparison,
  PerRetailerMap,
  PerRetailerResult,
  RetailerId,
  SearchHit,
} from '@consultor/api-types';
import type { RetailerConnector } from './connector.types.js';
import { RETAILER_ORDER } from './retailer-catalog.js';
import { normalizeLine } from './normalize.js';
import { compareHitsForShoppingPreference, lineSpecifiesQuantity } from './economy.js';
import { maybeFormatWarning, pickRepresentativeHit } from './matching.js';
import { withTimeout } from './timeout.js';
import { computeBasketSummary } from './basket-summary.js';

export type CompareEngineOptions = {
  retailerTimeoutMs?: number;
  signal?: AbortSignal;
  demo?: boolean;
  /** `basket`: incluye totales por cadena (suma de packs por línea). */
  mode?: CompareMode;
};

function unitLabel(hit: SearchHit): string | null {
  const b = hit.unit_basis;
  if (b === 'PER_KG') return 'EUR/kg';
  if (b === 'PER_L') return 'EUR/L';
  if (b === 'PER_UNIT') return 'EUR/unidad';
  return null;
}

function toPerRetailerOk(
  hit: SearchHit,
  confidence: number,
): Extract<PerRetailerResult, { error: null }> {
  return {
    label: hit.title,
    pack_size_label: hit.pack_size_label ?? null,
    net_quantity_g: hit.net_quantity_g ?? null,
    pack_price_eur: hit.pack_price_eur,
    unit: unitLabel(hit),
    unit_price_eur: hit.price_per_unit_eur ?? null,
    product_url: hit.product_url,
    match_confidence: confidence,
    source: hit.source ?? 'live',
    error: null,
  };
}

function toPerRetailerErr(message: string): Extract<PerRetailerResult, { error: string }> {
  return {
    label: null,
    pack_size_label: null,
    net_quantity_g: null,
    pack_price_eur: null,
    unit: null,
    unit_price_eur: null,
    product_url: null,
    match_confidence: null,
    source: null,
    error: message,
  };
}

async function safeSearch(
  connector: RetailerConnector,
  normalizedLine: string,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<{ hits: SearchHit[] } | { error: string }> {
  try {
    const hits = await withTimeout(
      connector.search(normalizedLine, { signal, limit: 30 }),
      timeoutMs,
      signal,
    );
    return { hits };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'timeout') return { error: 'Tiempo agotado' };
    if (msg === 'aborted') return { error: 'Cancelado' };
    return { error: 'No disponible' };
  }
}

export async function compareShoppingLines(
  lines: string[],
  connectors: Record<RetailerId, RetailerConnector>,
  options: CompareEngineOptions = {},
): Promise<CompareResponse> {
  const retailerTimeoutMs = options.retailerTimeoutMs ?? 8000;
  const signal = options.signal;
  const demo = options.demo ?? false;
  const mode = options.mode ?? 'per_item';

  const items: ItemComparison[] = [];

  for (const rawLine of lines) {
    const normalized_line = normalizeLine(rawLine);

    const settled = await Promise.all(
      RETAILER_ORDER.map(async (id) => {
        const connector = connectors[id];
        const result = await safeSearch(connector, normalized_line, retailerTimeoutMs, signal);
        return { id, result } as const;
      }),
    );

    const perRetailers: Partial<PerRetailerMap> = {};
    const winners: { retailer: RetailerId; hit: SearchHit; confidence: number }[] = [];

    for (const { id, result } of settled) {
      if ('error' in result) {
        perRetailers[id] = toPerRetailerErr(result.error);
        continue;
      }

      const matched = pickRepresentativeHit(normalized_line, result.hits);
      if (!matched) {
        perRetailers[id] = toPerRetailerErr('Sin coincidencia clara');
        continue;
      }

      perRetailers[id] = toPerRetailerOk(matched.hit, matched.match_confidence);
      winners.push({ retailer: id, hit: matched.hit, confidence: matched.match_confidence });
    }

    for (const id of RETAILER_ORDER) {
      if (!perRetailers[id]) {
        perRetailers[id] = toPerRetailerErr('No disponible');
      }
    }

    let cheapest_overall: CheapestOverall | null = null;

    if (winners.length > 0) {
      const preferEconomy = !lineSpecifiesQuantity(normalized_line);
      winners.sort((a, b) =>
        compareHitsForShoppingPreference(a.hit, b.hit, preferEconomy),
      );
      const top = winners[0]!;
      const second = winners[1];

      const warn = maybeFormatWarning(top.hit.net_quantity_g, second?.hit.net_quantity_g);

      cheapest_overall = {
        retailer: top.retailer,
        label: top.hit.title,
        pack_size_label: top.hit.pack_size_label ?? null,
        net_quantity_g: top.hit.net_quantity_g ?? null,
        pack_price_eur: top.hit.pack_price_eur,
        unit: unitLabel(top.hit),
        unit_price_eur: top.hit.price_per_unit_eur ?? null,
        product_url: top.hit.product_url,
        match_confidence: top.confidence,
        source: top.hit.source ?? 'live',
        format_warning: warn,
      };
    }

    items.push({
      line: rawLine,
      normalized_line,
      cheapest_overall,
      per_retailer: perRetailers as PerRetailerMap,
    });
  }

  const base: CompareResponse = {
    compared_at: new Date().toISOString(),
    demo,
    items,
  };

  if (mode === 'basket') {
    return {
      ...base,
      mode: 'basket',
      basket: computeBasketSummary(items),
    };
  }

  return base;
}
