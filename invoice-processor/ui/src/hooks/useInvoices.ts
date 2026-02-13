import { useState, useEffect, useCallback, useRef } from 'react';
import { searchInvoices, getInvoiceStatus } from '../api/invoices';
import type {
  InvoiceSearchItem,
  PaginationMeta,
  SearchFilters,
  InvoiceStatusResponse,
  InvoiceStatus,
} from '../types/invoice';

const DEFAULT_FILTERS: SearchFilters = {
  page: 1,
  limit: 15,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

interface UseInvoicesReturn {
  invoices: InvoiceSearchItem[];
  meta: PaginationMeta | null;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  refresh: () => void;
  setPage: (page: number) => void;
}

export function useInvoices(): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<InvoiceSearchItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInvoices = useCallback(async (currentFilters: SearchFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await searchInvoices(currentFilters);
      if (!controller.signal.aborted) {
        setInvoices(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchInvoices(filters);
    return () => abortRef.current?.abort();
  }, [filters, fetchInvoices]);

  const setFilters = useCallback((partial: Partial<SearchFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
      page: partial.page ?? 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const refresh = useCallback(() => {
    fetchInvoices(filters);
  }, [filters, fetchInvoices]);

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  return {
    invoices,
    meta,
    filters,
    loading,
    error,
    setFilters,
    resetFilters,
    refresh,
    setPage,
  };
}

interface UseInvoicePollingReturn {
  statuses: Map<string, InvoiceStatusResponse>;
  startPolling: (invoiceId: string) => void;
  stopPolling: (invoiceId: string) => void;
  stopAll: () => void;
}

const TERMINAL_STATUSES: InvoiceStatus[] = ['completed' as InvoiceStatus, 'failed' as InvoiceStatus];
const POLL_INTERVAL = 3000;

export function useInvoicePolling(
  onComplete?: () => void,
): UseInvoicePollingReturn {
  const [statuses, setStatuses] = useState<Map<string, InvoiceStatusResponse>>(
    new Map(),
  );
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const activeCountRef = useRef(0);

  const stopPolling = useCallback((invoiceId: string) => {
    const interval = intervalsRef.current.get(invoiceId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(invoiceId);
    }
  }, []);

  const stopAll = useCallback(() => {
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current.clear();
    activeCountRef.current = 0;
  }, []);

  const startPolling = useCallback(
    (invoiceId: string) => {
      if (intervalsRef.current.has(invoiceId)) return;

      activeCountRef.current += 1;

      const poll = async () => {
        try {
          const status = await getInvoiceStatus(invoiceId);
          setStatuses((prev) => {
            const next = new Map(prev);
            next.set(invoiceId, status);
            return next;
          });

          if (TERMINAL_STATUSES.includes(status.status)) {
            stopPolling(invoiceId);
            activeCountRef.current -= 1;
            if (activeCountRef.current <= 0) {
              activeCountRef.current = 0;
              onComplete?.();
            }
          }
        } catch {
          // Silently retry on next interval
        }
      };

      // Immediate first poll
      poll();
      const interval = setInterval(poll, POLL_INTERVAL);
      intervalsRef.current.set(invoiceId, interval);
    },
    [stopPolling, onComplete],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return { statuses, startPolling, stopPolling, stopAll };
}
