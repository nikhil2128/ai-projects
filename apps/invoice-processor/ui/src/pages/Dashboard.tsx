import { useCallback, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { InvoiceUploader } from '../components/invoices/InvoiceUploader';
import { InvoiceFilters } from '../components/invoices/InvoiceFilters';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { InvoiceStatusTracker } from '../components/invoices/InvoiceStatusTracker';
import { useInvoices, useInvoicePolling } from '../hooks/useInvoices';
import { useInvoiceUpload } from '../hooks/useInvoiceUpload';
import type { SearchFilters, SortField } from '../types/invoice';

export function Dashboard() {
  const {
    invoices,
    meta,
    filters,
    loading,
    error,
    setFilters,
    resetFilters,
    refresh,
    setPage,
  } = useInvoices();

  const {
    files,
    addFiles,
    removeFile,
    uploadAll,
    clearAll,
    isUploading,
  } = useInvoiceUpload();

  const { statuses, startPolling, stopAll: stopAllPolling } = useInvoicePolling(
    // Called when all polling completes - refresh the invoice list
    refresh,
  );

  const [showTracker, setShowTracker] = useState(false);

  const handleUpload = useCallback(async () => {
    const invoiceIds = await uploadAll();
    if (invoiceIds.length > 0) {
      setShowTracker(true);
      invoiceIds.forEach((id) => startPolling(id));
    }
  }, [uploadAll, startPolling]);

  const handleDismissTracker = useCallback(() => {
    setShowTracker(false);
    stopAllPolling();
  }, [stopAllPolling]);

  const handleSort = useCallback(
    (sortBy: SortField) => {
      const newOrder =
        filters.sortBy === sortBy && filters.sortOrder === 'DESC'
          ? 'ASC'
          : 'DESC';
      setFilters({ sortBy, sortOrder: newOrder, page: filters.page });
    },
    [filters, setFilters],
  );

  const handleApplyFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  return (
    <Layout>
      <Header onRefresh={refresh} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Upload Section */}
        <InvoiceUploader
          files={files}
          isUploading={isUploading}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onUpload={handleUpload}
          onClearAll={clearAll}
        />

        {/* Processing Status Tracker */}
        {showTracker && (
          <InvoiceStatusTracker
            statuses={statuses}
            onDismiss={handleDismissTracker}
          />
        )}

        {/* Filters */}
        <InvoiceFilters
          filters={filters}
          onApply={handleApplyFilters}
          onReset={resetFilters}
        />

        {/* Invoice List */}
        <InvoiceTable
          invoices={invoices}
          meta={meta}
          filters={filters}
          loading={loading}
          error={error}
          onSort={handleSort}
          onPageChange={setPage}
          onRetry={refresh}
        />
      </main>
    </Layout>
  );
}
