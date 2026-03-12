import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportStatusResponse, CreateExportInput } from '../types';
import { ExportStatus } from '../types';
import * as api from '../api';

const STORAGE_KEY = 'export-job-ids';
const POLL_MS = 3_000;

function loadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useExports() {
  const [exports, setExports] = useState<Map<string, ExportStatusResponse>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    const ids = loadIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled(ids.map(api.getExportStatus));
    setExports((prev) => {
      const next = new Map(prev);
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next.set(ids[i], r.value);
      });
      return next;
    });
    setLoading(false);
  }, []);

  const needsPolling = useCallback(() => {
    return Array.from(exports.values()).some(
      (e) =>
        e.status === ExportStatus.PENDING ||
        e.status === ExportStatus.PROCESSING,
    );
  }, [exports]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (needsPolling()) {
      intervalRef.current = setInterval(fetchAll, POLL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [needsPolling, fetchAll]);

  const createExport = useCallback(
    async (input: CreateExportInput) => {
      setCreating(true);
      setError(null);
      try {
        const result = await api.createExport(input);
        const ids = loadIds();
        ids.unshift(result.id);
        saveIds(ids);
        setExports((prev) => {
          const next = new Map(prev);
          next.set(result.id, result);
          return next;
        });
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create export';
        setError(msg);
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const removeExport = useCallback((id: string) => {
    const ids = loadIds().filter((i) => i !== id);
    saveIds(ids);
    setExports((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const sortedExports = Array.from(exports.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    exports: sortedExports,
    loading,
    creating,
    error,
    createExport,
    removeExport,
    refresh: fetchAll,
  };
}
