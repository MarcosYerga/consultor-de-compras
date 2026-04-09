export type { RetailerConnector, RetailerHealth } from './connector.types.js';
export { normalizeLine } from './normalize.js';
export { titleSimilarity } from './similarity.js';
export { compareShoppingLines } from './compare-engine.js';
export type { CompareEngineOptions } from './compare-engine.js';
export { computeBasketSummary } from './basket-summary.js';
export {
  comparableEconomyScore,
  compareHitsForShoppingPreference,
  lineSpecifiesQuantity,
} from './economy.js';
export {
  parseQuantityFromHitText,
  parseQuantityFromProductText,
} from './parse-product-quantity.js';
export { listRetailers, RETAILER_ORDER } from './retailer-catalog.js';
export { createMockConnector } from './mock-connector.js';
export { createMockConnectorRegistry, buildConnectorRegistry } from './registry.js';
export { pickRepresentativeHit, maybeFormatWarning } from './matching.js';
export { createMercadonaConnector } from './retailers/mercadona/mercadona.connector.js';
export type { MercadonaConnectorOptions } from './retailers/mercadona/mercadona.connector.js';
export { createLidlConnector } from './retailers/lidl/lidl.connector.js';
export type { LidlConnectorOptions } from './retailers/lidl/lidl.connector.js';
export { mapLidlItemToSearchHit, mapLidlSearchResponseToHits } from './retailers/lidl/lidl-mapper.js';
export { createDiaConnector } from './retailers/dia/dia.connector.js';
export type { DiaConnectorOptions } from './retailers/dia/dia.connector.js';
export { createAhorramasConnector } from './retailers/ahorramas/ahorramas.connector.js';
export type { AhorramasConnectorOptions } from './retailers/ahorramas/ahorramas.connector.js';
export { createEroskiConnector } from './retailers/eroski/eroski.connector.js';
export type { EroskiConnectorOptions } from './retailers/eroski/eroski.connector.js';
export { parseEroskiSearchHtml } from './retailers/eroski/eroski-parse-search.js';
export { createCarrefourConnector } from './retailers/carrefour/carrefour.connector.js';
export type { CarrefourConnectorOptions } from './retailers/carrefour/carrefour.connector.js';
export { createElCorteInglesConnector } from './retailers/el_corte_ingles/el_corte_ingles.connector.js';
export type { ElCorteInglesConnectorOptions } from './retailers/el_corte_ingles/el_corte_ingles.connector.js';
