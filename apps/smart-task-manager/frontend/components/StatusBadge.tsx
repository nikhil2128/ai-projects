import { TaskStatus } from '@/lib/types';

const statusConfig: Record<TaskStatus, { label: string; classes: string }> = {
  [TaskStatus.TODO]: {
    label: 'To Do',
    classes: 'bg-slate-100 text-slate-700',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    classes: 'bg-blue-100 text-blue-700',
  },
  [TaskStatus.IN_REVIEW]: {
    label: 'In Review',
    classes: 'bg-purple-100 text-purple-700',
  },
  [TaskStatus.DONE]: {
    label: 'Done',
    classes: 'bg-green-100 text-green-700',
  },
  [TaskStatus.CANCELLED]: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-700',
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
