import { useState } from 'react';
import type { CreateExportInput } from '../types';
import { PaginationStrategy } from '../types';

interface Props {
  onSubmit: (input: CreateExportInput) => Promise<void>;
  creating: boolean;
}

export function CreateExportForm({ onSubmit, creating }: Props) {
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<CreateExportInput>({
    apiUrl: '',
    email: '',
    paginationStrategy: PaginationStrategy.PAGE,
  });
  const [headersText, setHeadersText] = useState('');
  const [queryParamsText, setQueryParamsText] = useState('');

  function parseKV(text: string): Record<string, string> | undefined {
    if (!text.trim()) return undefined;
    const result: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateExportInput = {
      ...form,
      headers: parseKV(headersText),
      queryParams: parseKV(queryParamsText),
    };
    if (!input.pageSize) delete input.pageSize;
    if (!input.dataPath) delete input.dataPath;
    if (!input.cursorPath) delete input.cursorPath;
    if (!input.cursorParam) delete input.cursorParam;
    if (!input.fileName) delete input.fileName;

    await onSubmit(input);
    setForm({ apiUrl: '', email: '', paginationStrategy: PaginationStrategy.PAGE });
    setHeadersText('');
    setQueryParamsText('');
    setShowAdvanced(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Export
      </button>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Start New Export
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              API URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://api.example.com/v1/users"
              className={inputCls}
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Pagination Strategy</label>
            <select
              className={inputCls}
              value={form.paginationStrategy}
              onChange={(e) =>
                setForm({
                  ...form,
                  paginationStrategy: e.target.value as PaginationStrategy,
                })
              }
            >
              <option value={PaginationStrategy.PAGE}>Page-based</option>
              <option value={PaginationStrategy.OFFSET}>Offset-based</option>
              <option value={PaginationStrategy.CURSOR}>Cursor-based</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          {showAdvanced ? '− Hide' : '+ Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Page Size</label>
              <input
                type="number"
                min={1}
                max={5000}
                placeholder="500"
                className={inputCls}
                value={form.pageSize ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pageSize: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <label className={labelCls}>File Name</label>
              <input
                type="text"
                placeholder="my-export"
                className={inputCls}
                value={form.fileName ?? ''}
                onChange={(e) =>
                  setForm({ ...form, fileName: e.target.value || undefined })
                }
              />
            </div>

            <div>
              <label className={labelCls}>Data Path</label>
              <input
                type="text"
                placeholder="data"
                className={inputCls}
                value={form.dataPath ?? ''}
                onChange={(e) =>
                  setForm({ ...form, dataPath: e.target.value || undefined })
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                Dot path to data array in API response
              </p>
            </div>

            {form.paginationStrategy === PaginationStrategy.CURSOR && (
              <>
                <div>
                  <label className={labelCls}>Cursor Path</label>
                  <input
                    type="text"
                    placeholder="meta.nextCursor"
                    className={inputCls}
                    value={form.cursorPath ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cursorPath: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Cursor Param</label>
                  <input
                    type="text"
                    placeholder="cursor"
                    className={inputCls}
                    value={form.cursorParam ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cursorParam: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className={labelCls}>Headers</label>
              <textarea
                rows={3}
                placeholder={'Authorization: Bearer <token>\nAccept: application/json'}
                className={inputCls}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                One per line, format: Key: Value
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Query Params</label>
              <textarea
                rows={2}
                placeholder={'status: active\nregion: us-east-1'}
                className={inputCls}
                value={queryParamsText}
                onChange={(e) => setQueryParamsText(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                One per line, format: Key: Value
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              'Start Export'
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
