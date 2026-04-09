import type { RetailerId, SearchHit } from '@consultor/api-types';
import { normalizeLine } from './normalize.js';
import type { RetailerConnector } from './connector.types.js';
import { hashString } from './hash.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function titleCaseFragment(q: string): string {
  return q
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractLitersFromQuery(q: string): number | null {
  const m = q.match(/(\d+(?:[.,]\d+)?)\s*l\b/u);
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return n;
}

function looksLikeOliveOil(q: string): boolean {
  return q.includes('aceite') && q.includes('oliva');
}

/**
 * Conector simulado: resultados deterministas sin llamadas de red (modo demo / Fase 0).
 */
export function createMockConnector(retailerId: RetailerId): RetailerConnector {
  return {
    id: retailerId,
    async search(query: string, _opts?: { signal?: AbortSignal; limit?: number }) {
      const q = normalizeLine(query);
      const seed = hashString(`${retailerId}:${q}`);
      const liters = extractLitersFromQuery(q);
      const isOliveOil = looksLikeOliveOil(q);
      const isLiquid = liters != null;

      const base = isOliveOil
        ? 4 + (seed % 400) / 100
        : 0.35 + (seed % 900) / 1000;

      const volumeMl = isLiquid ? Math.round((liters ?? 1) * 1000) : undefined;
      const altVolumeMl = isLiquid ? volumeMl! + 250 : undefined;

      const netG = !isLiquid ? 350 + (seed % 6) * 50 : undefined;
      const altG = !isLiquid ? netG! + 100 : undefined;

      const labelA = `${titleCaseFragment(q)} marca referencia`;
      const labelB = `${titleCaseFragment(q)} económico`;

      const hits: SearchHit[] = [
        {
          title: labelA,
          pack_price_eur: round2(base + 0.12),
          price_per_unit_eur: isLiquid
            ? round2((base + 0.12) / ((volumeMl ?? 1000) / 1000))
            : round2(((base + 0.12) / (netG ?? 500)) * 1000),
          unit_basis: isLiquid ? 'PER_L' : 'PER_KG',
          product_url: `https://example.com/${retailerId}/product/${seed}-a`,
          pack_size_label: isLiquid ? `${(volumeMl ?? 1000) / 1000} l` : `${netG ?? 500} g`,
          net_quantity_g: netG,
          volume_ml: volumeMl,
          source: 'demo',
        },
        {
          title: labelB,
          pack_price_eur: round2(base),
          price_per_unit_eur: isLiquid
            ? round2(base / ((volumeMl ?? 1000) / 1000))
            : round2((base / (netG ?? 500)) * 1000),
          unit_basis: isLiquid ? 'PER_L' : 'PER_KG',
          product_url: `https://example.com/${retailerId}/product/${seed}-b`,
          pack_size_label: isLiquid ? `${(volumeMl ?? 1000) / 1000} l` : `${netG ?? 500} g`,
          net_quantity_g: netG,
          volume_ml: volumeMl,
          source: 'demo',
        },
        {
          title: `${titleCaseFragment(q)} formato familiar`,
          pack_price_eur: round2(base * 1.45),
          price_per_unit_eur: isLiquid
            ? round2((base * 1.45) / ((altVolumeMl ?? 1250) / 1000))
            : round2(((base * 1.45) / (altG ?? 600)) * 1000),
          unit_basis: isLiquid ? 'PER_L' : 'PER_KG',
          product_url: `https://example.com/${retailerId}/product/${seed}-c`,
          pack_size_label: isLiquid
            ? `${(altVolumeMl ?? 1250) / 1000} l`
            : `${altG ?? 600} g`,
          net_quantity_g: altG,
          volume_ml: altVolumeMl,
          offer_hint: seed % 2 === 0 ? 'MULTIBUY_N_FOR_M' : undefined,
          source: 'demo',
        },
      ];
      return hits;
    },
    async healthcheck() {
      const t0 = Date.now();
      return { ok: true, latency_ms: Date.now() - t0 };
    },
  };
}
