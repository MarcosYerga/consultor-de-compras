/**
 * Subconjunto tipado de la respuesta JSON de tienda.mercadona.es (no oficial).
 * La forma real puede variar; el mapper es defensivo.
 */
export type MercadonaPriceInstructions = {
  bulk_price?: string | null;
  unit_price?: string | null;
  unit_size?: number | null;
  reference_format?: string | null;
  size_format?: string | null;
};

export type MercadonaProductJson = {
  id: string;
  display_name: string;
  share_url: string;
  packaging?: string | null;
  price_instructions?: MercadonaPriceInstructions | null;
};

export type MercadonaCategoryNode = {
  id?: number;
  name?: string;
  categories?: MercadonaCategoryNode[];
  products?: MercadonaProductJson[];
  results?: MercadonaCategoryNode[];
};
