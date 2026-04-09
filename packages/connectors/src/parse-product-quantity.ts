/**
 * Muchos conectores solo tienen peso/volumen en el texto del producto (título o etiqueta de envase).
 * Extrae cantidad neta aproximada para comparar €/kg o €/L.
 */

export type ParsedProductQuantity = {
  net_g?: number;
  ml?: number;
};

function parseEuropeanNumber(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

/**
 * Intenta leer peso neto (g) o volumen (ml) desde un solo texto (título, pack_size_label, etc.).
 */
export function parseQuantityFromProductText(text: string): ParsedProductQuantity | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  // Multipack gramos: "6 x 90 g", "6x90g", "12 x 100 gr"
  const mPackG = t.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gramos)\b/u);
  if (mPackG?.[1] != null && mPackG[2] != null) {
    const n = parseInt(mPackG[1], 10);
    const g = parseEuropeanNumber(mPackG[2]);
    if (Number.isFinite(n) && Number.isFinite(g) && n > 0 && g > 0 && n <= 48) {
      return { net_g: n * g };
    }
  }

  // Multipack ml/cl: "6 x 100 ml", "6x20cl"
  const mPackMl = t.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(ml|cl)\b/u);
  if (mPackMl?.[1] != null && mPackMl[2] != null && mPackMl[3] != null) {
    const n = parseInt(mPackMl[1], 10);
    const v = parseEuropeanNumber(mPackMl[2]);
    const unit = mPackMl[3];
    if (Number.isFinite(n) && Number.isFinite(v) && n > 0 && v > 0 && n <= 48) {
      const mlUnit = unit === 'cl' ? v * 10 : v;
      return { ml: mlUnit * n };
    }
  }

  // Multipack litros: "6 x 1 l", "6x1l"
  const mPackL = t.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(l|litro|litros)\b/u);
  if (mPackL?.[1] != null && mPackL[2] != null) {
    const n = parseInt(mPackL[1], 10);
    const l = parseEuropeanNumber(mPackL[2]);
    if (Number.isFinite(n) && Number.isFinite(l) && n > 0 && l > 0 && n <= 48) {
      return { ml: n * l * 1000 };
    }
  }

  // kg antes que g suelto (evita confundir "0.5 kg" con "500 g" si ambos aparecieran)
  const mKg = t.match(/(\d+(?:[.,]\d+)?)\s*kg\b/u);
  if (mKg?.[1] != null) {
    const kg = parseEuropeanNumber(mKg[1]);
    if (Number.isFinite(kg) && kg > 0 && kg <= 50) {
      return { net_g: kg * 1000 };
    }
  }

  // Litros (1 l, 1,5 l, 1l)
  const mLiter = t.match(/(\d+(?:[.,]\d+)?)\s*(l|litro|litros)\b/u);
  if (mLiter?.[1] != null) {
    const L = parseEuropeanNumber(mLiter[1]);
    if (Number.isFinite(L) && L > 0 && L <= 50) {
      return { ml: L * 1000 };
    }
  }

  const mMl = t.match(/(\d+(?:[.,]\d+)?)\s*ml\b/u);
  if (mMl?.[1] != null) {
    const ml = parseEuropeanNumber(mMl[1]);
    if (Number.isFinite(ml) && ml > 0 && ml <= 20000) {
      return { ml };
    }
  }

  const mCl = t.match(/(\d+(?:[.,]\d+)?)\s*cl\b/u);
  if (mCl?.[1] != null) {
    const cl = parseEuropeanNumber(mCl[1]);
    if (Number.isFinite(cl) && cl > 0) {
      return { ml: cl * 10 };
    }
  }

  // Gramos sueltos (último: evita capturar "2 g" en tokens raros)
  const mG = t.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos)\b/u);
  if (mG?.[1] != null) {
    const g = parseEuropeanNumber(mG[1]);
    if (Number.isFinite(g) && g >= 1 && g < 100_000) {
      return { net_g: g };
    }
  }

  return null;
}

/**
 * Combina etiqueta de envase (suele ser más fiable) y título.
 */
export function parseQuantityFromHitText(hit: {
  title: string;
  pack_size_label?: string;
}): ParsedProductQuantity | null {
  const blob = [hit.pack_size_label, hit.title].filter(Boolean).join(' · ');
  return parseQuantityFromProductText(blob);
}
