import type { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  label: string;
  value?: string | null;
  icon?: LucideIcon;
}

export function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 w-4 shrink-0 text-gray-400">
        {Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-[100px] shrink-0 text-gray-500">{label}:</span>
      <span className="min-w-0 font-medium text-gray-800">{value}</span>
    </div>
  );
}
