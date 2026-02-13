export type UserRole = 'ADMIN' | 'ENGINEER' | 'PROCUREMENT' | 'FACTORY_WORKER';
export type AnnotationStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface Image {
  id: string;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  storageKey: string;
  thumbnailKey: string;
  uploaderId: string;
  uploader: UserSummary;
  createdAt: string;
  updatedAt: string;
  _count?: { annotations: number };
}

export interface ImageDetail extends Image {
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  imageId: string;
  authorId: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  label?: string;
  status: AnnotationStatus;
  author: UserSummary;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  annotationId: string;
  authorId: string;
  body: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ImagesResponse {
  images: Image[];
  pagination: PaginationInfo;
}

export interface AuthResponse {
  user: User;
  token: string;
}
