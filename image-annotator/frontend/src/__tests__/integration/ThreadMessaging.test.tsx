/**
 * Integration tests for thread messaging between multiple users.
 *
 * These tests verify:
 * - Real-time comment delivery between users via socket events
 * - Comment creation and display in annotation threads
 * - Comment deletion (own comments + admin privileges)
 * - Multi-user conversation flow in annotation threads
 * - Deduplication of comments (optimistic + socket)
 * - Thread state when annotations are modified by other users
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ImageDetailPage from '../../pages/ImageDetailPage';
import {
  createImageDetail,
  createCircleAnnotation,
  createAnnotationWithComments,
  createComment,
  createUserSummary,
  engineerUser,
  workerUser,
  adminUser,
  procurementUser,
} from '../../test/factories';
import type { Annotation, Comment as CommentType } from '../../types';

// ---------- Mocks ----------

let currentMockUser = engineerUser;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: currentMockUser,
    token: 'test-token',
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Socket mock with event handler capture
const mockEventHandlers = new Map<string, ((...args: any[]) => void)[]>();
const mockOnEvent = vi.fn((event: string, handler: (...args: any[]) => void) => {
  if (!mockEventHandlers.has(event)) {
    mockEventHandlers.set(event, []);
  }
  mockEventHandlers.get(event)!.push(handler);
  return () => {
    const handlers = mockEventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  };
});

vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({ socket: null, onEvent: mockOnEvent }),
}));

// API mocks
const mockGetImage = vi.fn();
const mockCreateAnnotation = vi.fn();
const mockDeleteAnnotation = vi.fn();
const mockUpdateAnnotation = vi.fn();
const mockCreateComment = vi.fn();
const mockDeleteComment = vi.fn();
const mockDeleteImage = vi.fn();

vi.mock('../../api/client', () => ({
  getImage: (...args: any[]) => mockGetImage(...args),
  createAnnotation: (...args: any[]) => mockCreateAnnotation(...args),
  deleteAnnotation: (...args: any[]) => mockDeleteAnnotation(...args),
  updateAnnotation: (...args: any[]) => mockUpdateAnnotation(...args),
  createComment: (...args: any[]) => mockCreateComment(...args),
  deleteComment: (...args: any[]) => mockDeleteComment(...args),
  deleteImage: (...args: any[]) => mockDeleteImage(...args),
  getImageFileUrl: (id: string) => `/api/images/${id}/file?token=test`,
}));

// ---------- Helpers ----------

function renderPage(imageId = 'img-1') {
  return render(
    <MemoryRouter initialEntries={[`/images/${imageId}`]}>
      <Routes>
        <Route path="/images/:id" element={<ImageDetailPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function simulateSocketEvent(event: string, data: any) {
  const handlers = mockEventHandlers.get(event);
  if (handlers) {
    act(() => {
      handlers.forEach((h) => h(data));
    });
  }
}

// ---------- Tests ----------

describe('Thread Messaging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventHandlers.clear();
    currentMockUser = engineerUser;
  });

  describe('viewing annotation threads', () => {
    it('displays annotations with their comment counts', async () => {
      const ann1 = createAnnotationWithComments(3, { id: 'th1', label: 'Thread One' });
      const ann2 = createAnnotationWithComments(1, { id: 'th2', label: 'Thread Two' });
      const ann3 = createCircleAnnotation({ id: 'th3', label: 'Thread Three', comments: [] });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann1, ann2, ann3] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Annotations (3)')).toBeInTheDocument();
      });

      expect(screen.getByText('Thread One')).toBeInTheDocument();
      expect(screen.getByText(/3 comments/)).toBeInTheDocument();
      expect(screen.getByText('Thread Two')).toBeInTheDocument();
      expect(screen.getByText(/\b1 comment\b/)).toBeInTheDocument();
      expect(screen.getByText('Thread Three')).toBeInTheDocument();
      expect(screen.getByText(/0 comments/)).toBeInTheDocument();
    });
  });

  describe('adding comments', () => {
    it('user can add a comment to an annotation thread', async () => {
      const user = userEvent.setup();
      const ann = createCircleAnnotation({
        id: 'comment-ann',
        label: 'Needs comment',
        comments: [],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      const newComment = createComment({
        id: 'new-c1',
        annotationId: 'comment-ann',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id, name: engineerUser.name, role: engineerUser.role }),
        body: 'This needs immediate attention',
      });
      mockCreateComment.mockResolvedValue(newComment);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Needs comment')).toBeInTheDocument();
      });

      // Select the annotation to expand it
      fireEvent.click(screen.getByText('Needs comment'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });

      // Type and submit a comment
      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'This needs immediate attention');

      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith(
          'comment-ann',
          'This needs immediate attention'
        );
      });
    });

    it('trims whitespace from comment body before submission', async () => {
      const user = userEvent.setup();
      const ann = createCircleAnnotation({ id: 'trim-ann', label: 'Trim test', comments: [] });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      mockCreateComment.mockResolvedValue(
        createComment({ body: 'Trimmed comment', annotationId: 'trim-ann' })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Trim test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Trim test'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, '  Trimmed comment  ');

      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith('trim-ann', 'Trimmed comment');
      });
    });
  });

  describe('real-time comment delivery', () => {
    it('receives a new comment from another user via socket', async () => {
      const ann = createCircleAnnotation({
        id: 'rt-ann',
        label: 'Real-time thread',
        comments: [],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Real-time thread')).toBeInTheDocument();
      });

      // Select the annotation
      fireEvent.click(screen.getByText('Real-time thread'));

      await waitFor(() => {
        expect(
          screen.getByText('No comments yet. Start the conversation below.')
        ).toBeInTheDocument();
      });

      // Simulate another user sending a comment via socket
      const remoteComment: CommentType & { annotationId: string } = {
        id: 'remote-c1',
        annotationId: 'rt-ann',
        authorId: workerUser.id,
        body: 'I checked this on the floor - confirmed defect',
        author: createUserSummary({ id: workerUser.id, name: 'Bob Worker', role: 'FACTORY_WORKER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      simulateSocketEvent('comment:created', remoteComment);

      await waitFor(() => {
        expect(
          screen.getByText('I checked this on the floor - confirmed defect')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Bob Worker')).toBeInTheDocument();
    });

    it('does not duplicate comments when receiving socket event for own comment', async () => {
      const existingComment = createComment({
        id: 'own-c1',
        annotationId: 'dedup-ann',
        authorId: engineerUser.id,
        body: 'My existing comment',
      });
      const ann = createCircleAnnotation({
        id: 'dedup-ann',
        label: 'Dedup test',
        comments: [existingComment],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Dedup test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dedup test'));

      await waitFor(() => {
        expect(screen.getByText('My existing comment')).toBeInTheDocument();
      });

      // Socket delivers the same comment again
      simulateSocketEvent('comment:created', {
        ...existingComment,
        annotationId: 'dedup-ann',
      });

      // Wait a tick and ensure no duplicate
      await waitFor(() => {
        const matches = screen.getAllByText('My existing comment');
        expect(matches).toHaveLength(1);
      });
    });

    it('receives multiple comments from multiple users', async () => {
      const ann = createCircleAnnotation({
        id: 'multi-ann',
        label: 'Multi-user thread',
        comments: [],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Multi-user thread')).toBeInTheDocument();
      });

      // Select annotation
      fireEvent.click(screen.getByText('Multi-user thread'));

      // Worker comment
      simulateSocketEvent('comment:created', {
        id: 'mc1',
        annotationId: 'multi-ann',
        authorId: workerUser.id,
        body: 'Noticed this during assembly',
        author: createUserSummary({ id: workerUser.id, name: 'Bob Worker', role: 'FACTORY_WORKER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Procurement comment
      simulateSocketEvent('comment:created', {
        id: 'mc2',
        annotationId: 'multi-ann',
        authorId: procurementUser.id,
        body: 'We need to check supplier quality',
        author: createUserSummary({ id: procurementUser.id, name: 'Carol Procurement', role: 'PROCUREMENT' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Engineer response
      simulateSocketEvent('comment:created', {
        id: 'mc3',
        annotationId: 'multi-ann',
        authorId: engineerUser.id,
        body: 'I will file a corrective action',
        author: createUserSummary({ id: engineerUser.id, name: 'Alice Engineer', role: 'ENGINEER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(screen.getByText('Noticed this during assembly')).toBeInTheDocument();
        expect(screen.getByText('We need to check supplier quality')).toBeInTheDocument();
        expect(screen.getByText('I will file a corrective action')).toBeInTheDocument();
      });
    });
  });

  describe('real-time comment deletion', () => {
    it('removes comment when another user deletes it via socket', async () => {
      const comment = createComment({
        id: 'del-c1',
        annotationId: 'del-thread',
        authorId: workerUser.id,
        body: 'This will be deleted',
        author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
      });
      const ann = createCircleAnnotation({
        id: 'del-thread',
        label: 'Deletion thread',
        comments: [comment],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Deletion thread')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Deletion thread'));

      await waitFor(() => {
        expect(screen.getByText('This will be deleted')).toBeInTheDocument();
      });

      // Admin deletes the comment from another client
      simulateSocketEvent('comment:deleted', {
        commentId: 'del-c1',
        annotationId: 'del-thread',
      });

      await waitFor(() => {
        expect(screen.queryByText('This will be deleted')).not.toBeInTheDocument();
      });
    });
  });

  describe('comment deletion by user', () => {
    it('user can delete their own comment', async () => {
      const comment = createComment({
        id: 'my-c1',
        annotationId: 'own-del-ann',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id, name: engineerUser.name, role: engineerUser.role }),
        body: 'My comment to delete',
      });
      const ann = createCircleAnnotation({
        id: 'own-del-ann',
        label: 'Own deletion test',
        comments: [comment],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );
      mockDeleteComment.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Own deletion test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Own deletion test'));

      await waitFor(() => {
        expect(screen.getByText('My comment to delete')).toBeInTheDocument();
      });

      // Click delete button on the comment
      const deleteBtn = screen.getByTitle('Delete comment');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(mockDeleteComment).toHaveBeenCalledWith('my-c1');
      });
    });
  });

  describe('annotation-level real-time events affecting threads', () => {
    it('annotation update from another user preserves thread comments', async () => {
      const comment = createComment({
        id: 'preserve-c',
        annotationId: 'preserve-ann',
        body: 'Preserved comment',
      });
      const ann = createCircleAnnotation({
        id: 'preserve-ann',
        label: 'Preserved thread',
        status: 'OPEN',
        comments: [comment],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Preserved thread')).toBeInTheDocument();
      });

      // Another user updates annotation status — the full annotation object is sent
      const updatedAnn = {
        ...ann,
        status: 'RESOLVED' as const,
        comments: [comment], // Comments should be preserved
      };
      simulateSocketEvent('annotation:updated', updatedAnn);

      // Thread should still show comments
      fireEvent.click(screen.getByText('Preserved thread'));

      await waitFor(() => {
        expect(screen.getByText('Preserved comment')).toBeInTheDocument();
      });
    });

    it('annotation deletion removes entire thread', async () => {
      const comments = [
        createComment({ id: 'rc1', body: 'First comment' }),
        createComment({ id: 'rc2', body: 'Second comment' }),
      ];
      const ann = createCircleAnnotation({
        id: 'full-del',
        label: 'Thread to delete',
        comments,
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Thread to delete')).toBeInTheDocument();
      });

      // Another user deletes the entire annotation
      simulateSocketEvent('annotation:deleted', { annotationId: 'full-del' });

      await waitFor(() => {
        expect(screen.queryByText('Thread to delete')).not.toBeInTheDocument();
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });
    });
  });

  describe('multi-user collaboration scenario', () => {
    it('simulates a full multi-user conversation flow', async () => {
      // Initial state: engineer created an annotation with one comment
      const initialComment = createComment({
        id: 'init-c',
        annotationId: 'collab-ann',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id, name: 'Alice Engineer', role: 'ENGINEER' }),
        body: 'Found a scratch on the surface',
      });
      const ann = createCircleAnnotation({
        id: 'collab-ann',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id, name: 'Alice Engineer', role: 'ENGINEER' }),
        label: 'Surface scratch',
        status: 'OPEN',
        comments: [initialComment],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Surface scratch')).toBeInTheDocument();
      });

      // Expand the thread
      fireEvent.click(screen.getByText('Surface scratch'));

      await waitFor(() => {
        expect(screen.getByText('Found a scratch on the surface')).toBeInTheDocument();
      });

      // Step 1: Worker responds via socket
      simulateSocketEvent('comment:created', {
        id: 'worker-reply',
        annotationId: 'collab-ann',
        authorId: workerUser.id,
        body: 'I can see it from the floor, looks like a tool mark',
        author: createUserSummary({ id: workerUser.id, name: 'Bob Worker', role: 'FACTORY_WORKER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(
          screen.getByText('I can see it from the floor, looks like a tool mark')
        ).toBeInTheDocument();
      });

      // Step 2: Procurement responds via socket
      simulateSocketEvent('comment:created', {
        id: 'proc-reply',
        annotationId: 'collab-ann',
        authorId: procurementUser.id,
        body: 'Checking if this is a supplier issue',
        author: createUserSummary({ id: procurementUser.id, name: 'Carol Procurement', role: 'PROCUREMENT' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(
          screen.getByText('Checking if this is a supplier issue')
        ).toBeInTheDocument();
      });

      // Step 3: Admin resolves the annotation
      const resolvedAnn = {
        ...ann,
        status: 'RESOLVED' as const,
        comments: [
          initialComment,
          {
            id: 'worker-reply',
            annotationId: 'collab-ann',
            authorId: workerUser.id,
            body: 'I can see it from the floor, looks like a tool mark',
            author: createUserSummary({ id: workerUser.id, name: 'Bob Worker', role: 'FACTORY_WORKER' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'proc-reply',
            annotationId: 'collab-ann',
            authorId: procurementUser.id,
            body: 'Checking if this is a supplier issue',
            author: createUserSummary({ id: procurementUser.id, name: 'Carol Procurement', role: 'PROCUREMENT' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      simulateSocketEvent('annotation:updated', resolvedAnn);

      // All messages should still be visible after the status update
      await waitFor(() => {
        expect(screen.getByText('Found a scratch on the surface')).toBeInTheDocument();
        expect(
          screen.getByText('I can see it from the floor, looks like a tool mark')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Checking if this is a supplier issue')
        ).toBeInTheDocument();
      });

      // Step 4: Admin adds a closing comment
      simulateSocketEvent('comment:created', {
        id: 'admin-close',
        annotationId: 'collab-ann',
        authorId: adminUser.id,
        body: 'Issue resolved - adjusting tooling parameters',
        author: createUserSummary({ id: adminUser.id, name: 'Admin', role: 'ADMIN' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(
          screen.getByText('Issue resolved - adjusting tooling parameters')
        ).toBeInTheDocument();
      });
    });

    it('handles rapid-fire comments from multiple users', async () => {
      const ann = createCircleAnnotation({
        id: 'rapid-ann',
        label: 'Rapid thread',
        comments: [],
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Rapid thread')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Rapid thread'));

      // Simulate rapid-fire comments from different users
      const users = [workerUser, engineerUser, procurementUser, adminUser];

      for (let i = 0; i < 10; i++) {
        const commentUser = users[i % users.length];
        simulateSocketEvent('comment:created', {
          id: `rapid-c-${i}`,
          annotationId: 'rapid-ann',
          authorId: commentUser.id,
          body: `Rapid comment ${i + 1}`,
          author: createUserSummary({
            id: commentUser.id,
            name: commentUser.name,
            role: commentUser.role,
          }),
          createdAt: new Date(Date.now() + i * 100).toISOString(),
          updatedAt: new Date(Date.now() + i * 100).toISOString(),
        });
      }

      // All 10 comments should be present
      await waitFor(() => {
        for (let i = 0; i < 10; i++) {
          expect(screen.getByText(`Rapid comment ${i + 1}`)).toBeInTheDocument();
        }
      });
    });
  });

  describe('concurrent annotation and thread operations', () => {
    it('handles new annotation with comments from another user', async () => {
      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });

      // Another user creates an annotation
      const newAnn = createCircleAnnotation({
        id: 'new-remote',
        authorId: workerUser.id,
        author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
        label: 'Remote annotation',
        comments: [],
      });

      simulateSocketEvent('annotation:created', newAnn);

      await waitFor(() => {
        expect(screen.getByText('Remote annotation')).toBeInTheDocument();
      });

      // Then the same user adds a comment to it
      simulateSocketEvent('comment:created', {
        id: 'remote-thread-c1',
        annotationId: 'new-remote',
        authorId: workerUser.id,
        body: 'Please review this issue',
        author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Select and expand the annotation
      fireEvent.click(screen.getByText('Remote annotation'));

      await waitFor(() => {
        expect(screen.getByText('Please review this issue')).toBeInTheDocument();
      });
    });

    it('thread state is consistent after annotation status changes', async () => {
      const comments = [
        createComment({
          id: 'cons-c1',
          annotationId: 'consistency-ann',
          body: 'Initial comment',
          authorId: engineerUser.id,
        }),
      ];
      const ann = createCircleAnnotation({
        id: 'consistency-ann',
        label: 'Consistency check',
        status: 'OPEN',
        comments,
      });

      mockGetImage.mockResolvedValue(
        createImageDetail({ id: 'img-1', annotations: [ann] })
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Consistency check')).toBeInTheDocument();
      });

      // Expand thread
      fireEvent.click(screen.getByText('Consistency check'));

      await waitFor(() => {
        expect(screen.getByText('Initial comment')).toBeInTheDocument();
      });

      // New comment arrives
      simulateSocketEvent('comment:created', {
        id: 'cons-c2',
        annotationId: 'consistency-ann',
        authorId: workerUser.id,
        body: 'Follow-up comment',
        author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Annotation gets resolved by someone else
      simulateSocketEvent('annotation:updated', {
        ...ann,
        status: 'RESOLVED',
        comments: [
          ...comments,
          {
            id: 'cons-c2',
            annotationId: 'consistency-ann',
            authorId: workerUser.id,
            body: 'Follow-up comment',
            author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      // Both comments should still be visible
      await waitFor(() => {
        expect(screen.getByText('Initial comment')).toBeInTheDocument();
        expect(screen.getByText('Follow-up comment')).toBeInTheDocument();
      });
    });
  });
});
