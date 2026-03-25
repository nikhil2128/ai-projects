import type { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  emptyValue?: string;
}

export function InfoCard({ icon: Icon, label, value, emptyValue = '—' }: InfoCardProps) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center">
      <div className="mb-2 flex justify-center text-primary-500">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800">{value || emptyValue}</div>
    </div>
  );
}
