import {
  AuthResponse,
  User,
  Project,
  Task,
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
  UpdateTaskDto,
  RegisterDto,
  ProjectMember,
  ProjectRole,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

export function removeToken(): void {
  localStorage.removeItem('accessToken');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'An unexpected error occurred' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || 'An unexpected error occurred';
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: RegisterDto) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<User>('/auth/profile'),
};

// ── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  getAll: () => request<Project[]>('/projects'),

  getOne: (id: string) => request<Project>(`/projects/${id}`),

  create: (data: CreateProjectDto) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProjectDto) =>
    request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),

  addMember: (id: string, userId: string, role?: ProjectRole) =>
    request<ProjectMember>(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  removeMember: (id: string, userId: string) =>
    request<void>(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  getByProject: (projectId: string) =>
    request<Task[]>(`/tasks/project/${projectId}`),

  getMyTasks: () => request<Task[]>('/tasks/my'),

  getOne: (id: string) => request<Task>(`/tasks/${id}`),

  create: (data: CreateTaskDto) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTaskDto) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  assign: (id: string, assigneeId: string) =>
    request<Task>(`/tasks/${id}/assign/${assigneeId}`, { method: 'PATCH' }),

  unassign: (id: string) =>
    request<Task>(`/tasks/${id}/unassign`, { method: 'PATCH' }),
};
