export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    throw new Error('aborted');
  }

  return await new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error('timeout'));
    }, ms);

    const onAbort = () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    promise
      .then((v) => {
        clearTimeout(t);
        signal?.removeEventListener('abort', onAbort);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        signal?.removeEventListener('abort', onAbort);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}
