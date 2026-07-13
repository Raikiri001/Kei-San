/**
 * Generic per-dataUrl memoization for expensive derived-from-pixels values
 * (dominant palette, edge color) so they're computed once at upload time and
 * never recomputed on every render or radial-menu open.
 */
export function createAnalysisCache<T>() {
  const cache = new Map<string, T>();
  return {
    get: (dataUrl: string): T | undefined => cache.get(dataUrl),
    set: (dataUrl: string, value: T): void => {
      cache.set(dataUrl, value);
    },
  };
}
