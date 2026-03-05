import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  subtitle?: string;
}

export default function StatCard({ label, value, icon, trend, subtitle }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-brand-50 rounded-lg text-brand-600">{icon}</div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend > 0
                ? "bg-emerald-50 text-emerald-600"
                : trend < 0
                ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}
