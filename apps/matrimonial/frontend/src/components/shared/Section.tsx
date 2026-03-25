import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <div className={className}>
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
