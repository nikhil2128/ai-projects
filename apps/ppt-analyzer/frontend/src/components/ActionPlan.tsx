import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Tag,
} from "lucide-react";
import type { ActionPlan as ActionPlanType } from "../types";

const PRIORITY_STYLES = {
  high: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400",
    icon: <ArrowRight className="w-3.5 h-3.5" />,
  },
  low: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

interface ActionPlanProps {
  plan: ActionPlanType;
}

export function ActionPlan({ plan }: ActionPlanProps) {
  return (
    <div className="glass-card rounded-xl p-5">
      <h4 className="text-white font-semibold mb-2">Action Plan</h4>
      <p className="text-slate-400 text-sm mb-5">{plan.summary}</p>

      <div className="space-y-3">
        {plan.actions.map((action) => {
          const style = PRIORITY_STYLES[action.priority];

          return (
            <div
              key={action.id}
              className={`rounded-lg border p-4 ${style.bg} ${style.border} transition-colors`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-white text-sm font-medium leading-snug flex-1">
                  {action.task}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0 ${style.badge}`}
                >
                  {style.icon}
                  {action.priority}
                </span>
              </div>

              {action.details && (
                <p className="text-slate-400 text-xs mb-3">{action.details}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {action.category && (
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {action.category}
                  </span>
                )}
                {action.suggestedTimeline && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {action.suggestedTimeline}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
