'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Task, TaskStatus, UpdateTaskDto } from '@/lib/types';
import { tasksApi } from '@/lib/api';
import { TaskCard } from '@/components/TaskCard';
import { TaskFormModal } from '@/components/TaskFormModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type FilterStatus = 'ALL' | TaskStatus;

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setError('');
      const data = await tasksApi.getMyTasks();
      setTasks(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    return true;
  });

  // Group tasks by project
  const tasksByProject = filteredTasks.reduce(
    (groups, task) => {
      const projectName = task.project?.name || 'Unknown Project';
      const projectId = task.projectId;
      const key = projectId;
      if (!groups[key]) {
        groups[key] = { name: projectName, id: projectId, tasks: [] };
      }
      groups[key].tasks.push(task);
      return groups;
    },
    {} as Record<string, { name: string; id: string; tasks: Task[] }>,
  );

  const handleUpdateTask = async (data: UpdateTaskDto) => {
    if (!editingTask) return;
    await tasksApi.update(editingTask.id, data);
    await loadTasks();
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await tasksApi.delete(deletingTask.id);
      await loadTasks();
      setIsDeleteOpen(false);
      setDeletingTask(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await tasksApi.update(task.id, { status: newStatus });
      await loadTasks();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update task status';
      setError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tasks assigned to you across all projects
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status filter pills */}
      {tasks.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({tasks.length})
          </button>
          {Object.values(TaskStatus).map((status) => {
            const count = tasks.filter((t) => t.status === status).length;
            if (count === 0) return null;
            return (
              <button
                key={status}
                onClick={() =>
                  setStatusFilter(statusFilter === status ? 'ALL' : status)
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.replace(/_/g, ' ')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Task list grouped by project */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned"
          description="You don't have any tasks assigned to you yet."
        />
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No tasks match your filter.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(tasksByProject).map((group) => (
            <div key={group.id}>
              <Link
                href={`/dashboard/projects/${group.id}`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                {group.name}
              </Link>
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsFormOpen(true);
                    }}
                    onDelete={(t) => {
                      setDeletingTask(t);
                      setIsDeleteOpen(true);
                    }}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTask && (
        <TaskFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateTask}
          task={editingTask}
          projectId={editingTask.projectId}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingTask(null);
        }}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </>
  );
}
