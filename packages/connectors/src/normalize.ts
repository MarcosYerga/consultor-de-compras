/**
 * Normaliza una línea de lista de compra para búsqueda y emparejado.
 * (minúsculas, espacios, unificación básica de unidades).
 */
export function normalizeLine(line: string): string {
  let s = line.trim().toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/(\d)\s*l\b/g, '$1 l');
  s = s.replace(/(\d)\s*kg\b/g, '$1 kg');
  return s.trim();
}
