/**
 * Subconjunto de la respuesta JSON de búsqueda Lidl (www.lidl.es/q/api/search).
 * Formato propietario; el código es defensivo ante cambios menores.
 */
export type LidlPriceBlock = {
  price?: number;
  currencyCode?: string;
};

export type LidlGridData = {
  fullTitle?: string;
  canonicalUrl?: string;
  canonicalPath?: string;
  keyfacts?: { title?: string; fullTitle?: string };
  price?: LidlPriceBlock;
  havingPrice?: boolean;
};

export type LidlSearchItem = {
  type?: string;
  resultClass?: string;
  gridbox?: { data?: LidlGridData };
};
