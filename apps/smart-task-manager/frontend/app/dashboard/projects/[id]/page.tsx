'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Project,
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskDto,
  UpdateTaskDto,
} from '@/lib/types';
import { projectsApi, tasksApi } from '@/lib/api';
import { TaskCard } from '@/components/TaskCard';
import { TaskFormModal } from '@/components/TaskFormModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type FilterStatus = 'ALL' | TaskStatus;
type FilterPriority = 'ALL' | TaskPriority;

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [priorityFilter, setPriorityFilter] =
    useState<FilterPriority>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Task form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [projectData, tasksData] = await Promise.all([
        projectsApi.getOne(projectId),
        tasksApi.getByProject(projectId),
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 404 || apiErr.status === 403) {
        router.replace('/dashboard/projects');
        return;
      }
      setError(
        apiErr.message ||
          (err instanceof Error ? err.message : 'Failed to load project'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter)
      return false;
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const handleCreateTask = async (data: CreateTaskDto | UpdateTaskDto) => {
    await tasksApi.create(data as CreateTaskDto);
    await loadData();
  };

  const handleUpdateTask = async (data: CreateTaskDto | UpdateTaskDto) => {
    if (!editingTask) return;
    await tasksApi.update(editingTask.id, data as UpdateTaskDto);
    await loadData();
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await tasksApi.delete(deletingTask.id);
      await loadData();
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
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update task status';
      setError(message);
    }
  };

  const statusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {project.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            {project.owner && (
              <span>
                Owner: {project.owner.firstName} {project.owner.lastName}
              </span>
            )}
            <span>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Task
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status Summary Cards */}
      {tasks.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.values(TaskStatus).map((status) => {
            const count = statusCounts[status] || 0;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() =>
                  setStatusFilter(isActive ? 'ALL' : status)
                }
                className={`rounded-lg border p-3 text-center transition-all ${
                  isActive
                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">
                  {status.replace(/_/g, ' ')}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {tasks.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as FilterPriority)
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          {(statusFilter !== 'ALL' ||
            priorityFilter !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setSearchQuery('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create your first task to get started."
          action={
            <button
              onClick={() => {
                setEditingTask(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Task
            </button>
          }
        />
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No tasks match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
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
      )}

      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        projectId={projectId}
        members={project.members}
      />

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
