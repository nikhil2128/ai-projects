import { TaskPriority } from '@/lib/types';

const priorityConfig: Record<
  TaskPriority,
  { label: string; classes: string; icon: string }
> = {
  [TaskPriority.LOW]: {
    label: 'Low',
    classes: 'text-gray-500',
    icon: '\u2193',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    classes: 'text-yellow-600',
    icon: '\u2192',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    classes: 'text-orange-600',
    icon: '\u2191',
  },
  [TaskPriority.URGENT]: {
    label: 'Urgent',
    classes: 'text-red-600',
    icon: '\u21E7',
  },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${config.classes}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
