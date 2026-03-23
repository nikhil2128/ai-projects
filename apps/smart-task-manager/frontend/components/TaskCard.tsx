'use client';

import { Task, TaskStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const nextStatus: Partial<Record<TaskStatus, TaskStatus>> = {
  [TaskStatus.TODO]: TaskStatus.IN_PROGRESS,
  [TaskStatus.IN_PROGRESS]: TaskStatus.IN_REVIEW,
  [TaskStatus.IN_REVIEW]: TaskStatus.DONE,
};

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;
  const isCancelled = task.status === TaskStatus.CANCELLED;
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && !isDone && !isCancelled;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`group rounded-lg border bg-white p-4 transition-all hover:shadow-md ${
        isDone
          ? 'border-green-200 bg-green-50/30'
          : isCancelled
            ? 'border-gray-200 bg-gray-50/50'
            : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {nextStatus[task.status] && (
              <button
                onClick={() => onStatusChange(task, nextStatus[task.status]!)}
                className="mt-0.5 flex-shrink-0 rounded border border-gray-300 p-0.5 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                title={`Move to ${nextStatus[task.status]?.replace(/_/g, ' ')}`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            {isDone && (
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <h4
              className={`text-sm font-medium ${
                isDone || isCancelled
                  ? 'text-gray-500 line-through'
                  : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>
          </div>

          {task.description && (
            <p className="mt-1 line-clamp-2 pl-7 text-xs text-gray-500">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Edit task"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 pl-7">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />

        {task.assignee && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
              {task.assignee.firstName[0]}
              {task.assignee.lastName[0]}
            </div>
            {task.assignee.firstName}
          </span>
        )}

        {task.dueDate && (
          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'font-medium text-red-600' : 'text-gray-500'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
