import type { RetailerId, SearchHit } from '@consultor/api-types';

export type RetailerHealth = {
  ok: boolean;
  latency_ms: number;
  error?: string;
};

/**
 * Contrato interno por cadena (§8.1 biblia).
 */
export type RetailerConnector = {
  readonly id: RetailerId;
  search(query: string, opts?: { signal?: AbortSignal; limit?: number }): Promise<SearchHit[]>;
  healthcheck(): Promise<RetailerHealth>;
};
