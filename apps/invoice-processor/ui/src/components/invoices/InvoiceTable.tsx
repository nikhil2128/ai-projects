import { memo, useCallback } from 'react';
import type {
  InvoiceSearchItem,
  PaginationMeta,
  SearchFilters,
  SortField,
} from '../../types/invoice';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Pagination } from './Pagination';

interface InvoiceTableProps {
  invoices: InvoiceSearchItem[];
  meta: PaginationMeta | null;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  onSort: (sortBy: SortField) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

const SortButton = memo(function SortButton({
  field,
  currentSort,
  currentOrder,
  children,
  onSort,
}: {
  field: SortField;
  currentSort: SortField;
  currentOrder: string;
  children: React.ReactNode;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 group"
    >
      <span>{children}</span>
      <svg
        className={`w-3.5 h-3.5 transition-colors ${
          isActive ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-400'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        {isActive && currentOrder === 'ASC' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        )}
      </svg>
    </button>
  );
});

export const InvoiceTable = memo(function InvoiceTable({
  invoices,
  meta,
  filters,
  loading,
  error,
  onSort,
  onPageChange,
  onRetry,
}: InvoiceTableProps) {
  const handleSort = useCallback(
    (field: SortField) => {
      onSort(field);
    },
    [onSort],
  );

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
          title="Failed to load invoices"
          description={error}
          action={
            <button
              onClick={onRetry}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (!loading && invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0H9.75m0 0H8.25m1.5 0v3.75m0-3.75v-3.75m6-3.75H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
          title="No invoices found"
          description="Upload PDF invoices to get started, or adjust your filters."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {loading && (
        <div className="flex items-center justify-center p-4 border-b border-gray-100">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">Loading invoices...</span>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                File
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                <SortButton
                  field="vendorName"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={handleSort}
                >
                  Vendor
                </SortButton>
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                <SortButton
                  field="amount"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={handleSort}
                >
                  Amount
                </SortButton>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                <SortButton
                  field="dueDate"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={handleSort}
                >
                  Due Date
                </SortButton>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                <SortButton
                  field="createdAt"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={handleSort}
                >
                  Uploaded
                </SortButton>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-red-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {invoice.originalFilename}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {invoice.vendorName || '--'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {formatDate(invoice.dueDate)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {formatDateTime(invoice.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                </svg>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {invoice.originalFilename}
                </span>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Vendor:</span>{' '}
                <span className="text-gray-900 font-medium">
                  {invoice.vendorName || '--'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>{' '}
                <span className="text-gray-900 font-medium">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Due:</span>{' '}
                <span className="text-gray-700">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Uploaded:</span>{' '}
                <span className="text-gray-700">
                  {formatDateTime(invoice.createdAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta && (
        <div className="border-t border-gray-100 px-4 sm:px-6 py-3">
          <Pagination meta={meta} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
});
