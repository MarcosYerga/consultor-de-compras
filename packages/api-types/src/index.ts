import { z } from 'zod';

/** Identificadores estables de las 7 cadenas (orden alfabético en catálogo). */
export const RETAILER_IDS = [
  'ahorramas',
  'carrefour',
  'dia',
  'el_corte_ingles',
  'eroski',
  'lidl',
  'mercadona',
] as const;

export const retailerIdSchema = z.enum(RETAILER_IDS);
export type RetailerId = z.infer<typeof retailerIdSchema>;

export const unitBasisSchema = z.enum(['PER_KG', 'PER_L', 'PER_UNIT', 'UNKNOWN']);
export type UnitBasis = z.infer<typeof unitBasisSchema>;

export const dataSourceSchema = z.enum(['live', 'stale', 'demo']);
export type DataSource = z.infer<typeof dataSourceSchema>;

export const compareModeSchema = z.enum(['per_item', 'basket']);
export type CompareMode = z.infer<typeof compareModeSchema>;

export const compareRequestSchema = z.object({
  lines: z
    .array(z.string().max(800))
    .min(1)
    .max(40)
    .refine((lines) => lines.every((l) => l.trim().length > 0), {
      message: 'Cada línea debe contener texto',
    }),
  mode: compareModeSchema.optional(),
});

export type CompareRequest = z.infer<typeof compareRequestSchema>;

/** Resultado interno de un conector antes del emparejado por línea. */
export const searchHitSchema = z.object({
  title: z.string(),
  pack_price_eur: z.number().nonnegative(),
  price_per_unit_eur: z.number().nonnegative().optional(),
  unit_basis: unitBasisSchema.optional(),
  product_url: z.string().url(),
  pack_size_label: z.string().optional(),
  net_quantity_g: z.number().positive().optional(),
  volume_ml: z.number().positive().optional(),
  offer_hint: z.string().optional(),
  source: dataSourceSchema.optional(),
});

export type SearchHit = z.infer<typeof searchHitSchema>;

const perRetailerSuccessSchema = z.object({
  label: z.string().nullable(),
  pack_size_label: z.string().nullable(),
  net_quantity_g: z.number().nullable(),
  pack_price_eur: z.number().nullable(),
  unit: z.string().nullable(),
  unit_price_eur: z.number().nullable(),
  product_url: z.string().nullable(),
  match_confidence: z.number().min(0).max(1).nullable(),
  source: dataSourceSchema,
  error: z.null(),
});

const perRetailerErrorSchema = z.object({
  label: z.null(),
  pack_size_label: z.null(),
  net_quantity_g: z.null(),
  pack_price_eur: z.null(),
  unit: z.null(),
  unit_price_eur: z.null(),
  product_url: z.null(),
  match_confidence: z.null(),
  source: z.null(),
  error: z.string(),
});

export const perRetailerResultSchema = z.union([perRetailerSuccessSchema, perRetailerErrorSchema]);

export type PerRetailerResult = z.infer<typeof perRetailerResultSchema>;

export const perRetailerMapSchema = z.object({
  ahorramas: perRetailerResultSchema,
  carrefour: perRetailerResultSchema,
  dia: perRetailerResultSchema,
  el_corte_ingles: perRetailerResultSchema,
  eroski: perRetailerResultSchema,
  lidl: perRetailerResultSchema,
  mercadona: perRetailerResultSchema,
});

export type PerRetailerMap = z.infer<typeof perRetailerMapSchema>;

export const cheapestOverallSchema = z.object({
  retailer: retailerIdSchema,
  label: z.string(),
  pack_size_label: z.string().nullable(),
  net_quantity_g: z.number().nullable(),
  pack_price_eur: z.number(),
  unit: z.string().nullable(),
  unit_price_eur: z.number().nullable(),
  product_url: z.string().nullable(),
  match_confidence: z.number().min(0).max(1),
  source: dataSourceSchema,
  format_warning: z.string().nullable(),
});

export type CheapestOverall = z.infer<typeof cheapestOverallSchema>;

export const itemComparisonSchema = z.object({
  line: z.string(),
  normalized_line: z.string(),
  cheapest_overall: cheapestOverallSchema.nullable(),
  per_retailer: perRetailerMapSchema,
});

export type ItemComparison = z.infer<typeof itemComparisonSchema>;

export const basketRowSchema = z.object({
  retailer: retailerIdSchema,
  total_eur: z.number(),
  lines_included: z.number().int().nonnegative(),
  lines_total: z.number().int().nonnegative(),
  complete: z.boolean(),
});

export type BasketRow = z.infer<typeof basketRowSchema>;

export const basketSummarySchema = z.object({
  /** Suma del pack por cadena (solo líneas donde hay precio). */
  by_retailer: z.array(basketRowSchema),
  /** Cadena con menor suma entre las que tienen precio en todas las líneas. */
  cheapest_full_basket: retailerIdSchema.nullable(),
});

export type BasketSummary = z.infer<typeof basketSummarySchema>;

export const compareResponseSchema = z.object({
  compared_at: z.string(),
  demo: z.boolean(),
  /** Eco del modo pedido (`basket` solo si se incluyó `mode: basket` en la petición). */
  mode: compareModeSchema.optional(),
  items: z.array(itemComparisonSchema),
  basket: basketSummarySchema.optional(),
});

export type CompareResponse = z.infer<typeof compareResponseSchema>;

export const retailerInfoSchema = z.object({
  id: retailerIdSchema,
  name: z.string(),
});

export type RetailerInfo = z.infer<typeof retailerInfoSchema>;

export const retailersListResponseSchema = z.object({
  retailers: z.array(retailerInfoSchema),
});

export type RetailersListResponse = z.infer<typeof retailersListResponseSchema>;
