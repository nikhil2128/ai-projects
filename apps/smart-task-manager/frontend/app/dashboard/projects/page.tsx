'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, CreateProjectDto, UpdateProjectDto } from '@/lib/types';
import { projectsApi } from '@/lib/api';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectFormModal } from '@/components/ProjectFormModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setError('');
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (data: CreateProjectDto | UpdateProjectDto) => {
    await projectsApi.create(data as CreateProjectDto);
    await loadProjects();
  };

  const handleUpdate = async (data: CreateProjectDto | UpdateProjectDto) => {
    if (!editingProject) return;
    await projectsApi.update(editingProject.id, data as UpdateProjectDto);
    await loadProjects();
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(deletingProject.id);
      await loadProjects();
      setIsDeleteOpen(false);
      setDeletingProject(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const openDelete = (project: Project) => {
    setDeletingProject(project);
    setIsDeleteOpen(true);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your projects and team collaboration
          </p>
        </div>
        <button
          onClick={openCreate}
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
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organizing tasks."
          action={
            <button
              onClick={openCreate}
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
              Create Project
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdate : handleCreate}
        project={editingProject}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingProject(null);
        }}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This will also delete all associated tasks. This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </>
  );
}
