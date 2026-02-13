import { memo, useCallback, useMemo } from 'react';
import type { PaginationMeta } from '../../types/invoice';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export const Pagination = memo(function Pagination({
  meta,
  onPageChange,
}: PaginationProps) {
  const { page, totalPages, totalItems, limit, hasNextPage, hasPreviousPage } =
    meta;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  const pages = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      if (start > 2) result.push('ellipsis');
      for (let i = start; i <= end; i++) result.push(i);
      if (end < totalPages - 1) result.push('ellipsis');
      result.push(totalPages);
    }

    return result;
  }, [page, totalPages]);

  const handlePrev = useCallback(() => {
    if (hasPreviousPage) onPageChange(page - 1);
  }, [page, hasPreviousPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (hasNextPage) onPageChange(page + 1);
  }, [page, hasNextPage, onPageChange]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 sm:px-0">
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{startItem}</span>{' '}
        to <span className="font-medium text-gray-700">{endItem}</span> of{' '}
        <span className="font-medium text-gray-700">{totalItems}</span> results
      </p>
      <nav
        className="flex items-center gap-1 order-1 sm:order-2"
        aria-label="Pagination"
      >
        <button
          onClick={handlePrev}
          disabled={!hasPreviousPage}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[36px] h-9 text-sm font-medium rounded-lg transition-colors ${
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={handleNext}
          disabled={!hasNextPage}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
});
