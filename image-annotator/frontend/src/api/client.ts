import type { AuthResponse, ImagesResponse, ImageDetail, Annotation, Comment } from '../types';

const BASE_URL = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || 'Request failed');
  }

  return response.json();
}

// Auth
export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  name: string,
  role?: string,
  department?: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, department }),
  });
}

export async function getMe() {
  return request<AuthResponse['user']>('/auth/me');
}

// Images
export async function getImages(page: number = 1, limit: number = 20): Promise<ImagesResponse> {
  return request<ImagesResponse>(`/images?page=${page}&limit=${limit}`);
}

export async function getImage(id: string): Promise<ImageDetail> {
  return request<ImageDetail>(`/images/${id}`);
}

export async function uploadImage(
  file: File,
  title: string,
  description?: string
): Promise<ImageDetail> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('title', title);
  if (description) formData.append('description', description);

  return request<ImageDetail>('/images', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteImage(id: string): Promise<{ success: boolean }> {
  return request('/images/' + id, { method: 'DELETE' });
}

export function getImageFileUrl(id: string): string {
  const token = localStorage.getItem('token');
  return `${BASE_URL}/images/${id}/file?token=${token}`;
}

export function getThumbnailUrl(id: string): string {
  const token = localStorage.getItem('token');
  return `${BASE_URL}/images/${id}/thumbnail?token=${token}`;
}

// Annotations
export async function createAnnotation(
  imageId: string,
  data: {
    centerX: number;
    centerY: number;
    radius: number;
    color?: string;
    label?: string;
  }
): Promise<Annotation> {
  return request<Annotation>(`/images/${imageId}/annotations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnnotation(
  annotationId: string,
  data: Partial<{
    centerX: number;
    centerY: number;
    radius: number;
    color: string;
    label: string;
    status: string;
  }>
): Promise<Annotation> {
  return request<Annotation>(`/annotations/${annotationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAnnotation(id: string): Promise<{ success: boolean }> {
  return request(`/annotations/${id}`, { method: 'DELETE' });
}

// Comments
export async function createComment(
  annotationId: string,
  body: string
): Promise<Comment> {
  return request<Comment>(`/annotations/${annotationId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function deleteComment(id: string): Promise<{ success: boolean }> {
  return request(`/comments/${id}`, { method: 'DELETE' });
}

export { ApiError };
