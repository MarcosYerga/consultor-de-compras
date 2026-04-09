const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'y', 'con', 'sin', 'para']);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}
