import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_TIME = 30_000;
const DEFAULT_CACHE_TIME = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > DEFAULT_CACHE_TIME) {
      queryCache.delete(key);
    }
  }
}, 60_000);

interface UseQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const { enabled = true, staleTime = DEFAULT_STALE_TIME, onSuccess, onError } = options;
  const [data, setData] = useState<T | undefined>(() => {
    const cached = queryCache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return cached.data;
    }
    return undefined;
  });
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const fetchData = useCallback(async () => {
    const cached = queryCache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < staleTime) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    let promise = inflightRequests.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetcherRef.current();
      inflightRequests.set(key, promise);
    }

    setLoading(true);
    setError(null);

    try {
      const result = await promise;
      queryCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Fetch failed");
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      inflightRequests.delete(key);
      setLoading(false);
    }
  }, [key, staleTime]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
  }, [enabled, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function invalidateQuery(keyPrefix: string): void {
  for (const key of queryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      queryCache.delete(key);
    }
  }
}

export function setQueryData<T>(key: string, data: T): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}
