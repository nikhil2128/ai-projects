import { memo, useState, useCallback } from 'react';
import type { SearchFilters } from '../../types/invoice';

interface InvoiceFiltersProps {
  filters: SearchFilters;
  onApply: (filters: Partial<SearchFilters>) => void;
  onReset: () => void;
}

export const InvoiceFilters = memo(function InvoiceFilters({
  filters,
  onApply,
  onReset,
}: InvoiceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [vendorName, setVendorName] = useState(filters.vendorName || '');
  const [amountMin, setAmountMin] = useState(
    filters.amountMin !== undefined ? String(filters.amountMin) : '',
  );
  const [amountMax, setAmountMax] = useState(
    filters.amountMax !== undefined ? String(filters.amountMax) : '',
  );
  const [dueDateFrom, setDueDateFrom] = useState(filters.dueDateFrom || '');
  const [dueDateTo, setDueDateTo] = useState(filters.dueDateTo || '');

  const hasActiveFilters =
    !!filters.vendorName ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined ||
    !!filters.dueDateFrom ||
    !!filters.dueDateTo;

  const handleApply = useCallback(() => {
    onApply({
      vendorName: vendorName || undefined,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
    });
  }, [vendorName, amountMin, amountMax, dueDateFrom, dueDateTo, onApply]);

  const handleReset = useCallback(() => {
    setVendorName('');
    setAmountMin('');
    setAmountMax('');
    setDueDateFrom('');
    setDueDateTo('');
    onReset();
  }, [onReset]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleApply();
    },
    [handleApply],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:px-6 text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-900">Filters</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
              !
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 pt-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Vendor Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by vendor..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Amount Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                />
                <span className="text-gray-400 text-sm">&ndash;</span>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Due Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Due Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-400 text-sm">&ndash;</span>
                <input
                  type="date"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Apply Filters
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
