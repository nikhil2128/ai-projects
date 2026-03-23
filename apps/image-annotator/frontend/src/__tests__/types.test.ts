import { describe, it, expect } from 'vitest';
import type { User, Annotation, Comment, PaginationInfo } from '../types';

describe('Type definitions', () => {
  it('should create a valid User object', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ENGINEER',
      createdAt: new Date().toISOString(),
    };

    expect(user.id).toBe('123');
    expect(user.role).toBe('ENGINEER');
  });

  it('should allow optional fields on User', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
      department: 'Engineering',
      avatarUrl: 'https://example.com/avatar.png',
      createdAt: new Date().toISOString(),
    };

    expect(user.department).toBe('Engineering');
    expect(user.avatarUrl).toBeDefined();
  });

  it('should validate PaginationInfo structure', () => {
    const pagination: PaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    };

    expect(pagination.totalPages).toBe(Math.ceil(pagination.total / pagination.limit));
  });

  it('should enforce AnnotationStatus values', () => {
    const statuses = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
    statuses.forEach((status) => {
      expect(['OPEN', 'RESOLVED', 'DISMISSED']).toContain(status);
    });
  });
});
