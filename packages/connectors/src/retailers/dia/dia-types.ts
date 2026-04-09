export type DiaSearchProduct = {
  display_name?: string;
  url?: string;
  object_id?: string;
  prices?: {
    currency?: string;
    price?: number;
    price_per_unit?: number;
    measure_unit?: string;
  };
};
