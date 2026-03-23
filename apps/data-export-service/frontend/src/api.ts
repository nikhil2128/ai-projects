import type { CreateExportInput, ExportStatusResponse } from './types';

const BASE = '/api/v1/exports';

export async function createExport(
  input: CreateExportInput,
): Promise<ExportStatusResponse> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getExportStatus(
  id: string,
): Promise<ExportStatusResponse> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}
