import type { RetailerId } from '@consultor/api-types';
import type { RetailerConnector } from './connector.types.js';
import { RETAILER_ORDER } from './retailer-catalog.js';
import { createMockConnector } from './mock-connector.js';

/**
 * Registro mock completo para demo y tests sin red.
 */
export function createMockConnectorRegistry(): Record<RetailerId, RetailerConnector> {
  const out = {} as Record<RetailerId, RetailerConnector>;
  for (const id of RETAILER_ORDER) {
    out[id] = createMockConnector(id);
  }
  return out;
}

/**
 * Construye un registro con base mock y override selectivo por cadena.
 */
export function buildConnectorRegistry(
  overrides: Partial<Record<RetailerId, RetailerConnector>>,
): Record<RetailerId, RetailerConnector> {
  return { ...createMockConnectorRegistry(), ...overrides };
}
