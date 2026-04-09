import type { CompareMode, CompareResponse } from '@consultor/api-types';

export async function postCompare(
  lines: string[],
  demo: boolean,
  mode: CompareMode = 'per_item',
): Promise<CompareResponse> {
  const qs = demo ? '?demo=1' : '';
  const res = await fetch(`/v1/compare${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, mode }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? `Error HTTP ${res.status}`);
  }

  return res.json() as Promise<CompareResponse>;
}
