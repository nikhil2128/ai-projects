import { type ReactNode, memo } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-400">
            Invoice Processor &mdash; Automated invoice data extraction
          </p>
        </div>
      </footer>
    </div>
  );
});
