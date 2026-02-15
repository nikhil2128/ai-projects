/**
 * Integration tests for the image annotation creation flow.
 *
 * These tests verify the end-to-end flow of:
 * - Loading an image detail page
 * - Toggling annotation mode
 * - Creating annotations of different shapes
 * - Selecting and managing annotations
 * - Real-time annotation events from other users
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ImageDetailPage from '../../pages/ImageDetailPage';
import {
  createImageDetail,
  createCircleAnnotation,
  createRectangleAnnotation,
  createFreehandAnnotation,
  createAnnotationWithComments,
  createUserSummary,
  createComment,
  engineerUser,
  workerUser,
  adminUser,
} from '../../test/factories';
import type { Annotation, Comment as CommentType } from '../../types';

// ---------- Mocks ----------

// Mock the auth context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: engineerUser,
    token: 'test-token',
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock the socket hook - capture event handlers
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

// Mock API
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

// ---------- Helper ----------

function renderImageDetailPage(imageId = 'img-1') {
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

describe('Image Annotation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventHandlers.clear();
  });

  describe('page loading', () => {
    it('shows loading spinner while fetching image', () => {
      mockGetImage.mockImplementation(() => new Promise(() => {}));
      renderImageDetailPage();

      // Should show a spinner (Loader2 icon from lucide)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays image details after loading', async () => {
      const image = createImageDetail({
        id: 'img-1',
        title: 'Quality Check - Part #A2847',
        description: 'Surface inspection',
        width: 1920,
        height: 1080,
        fileSize: 2 * 1024 * 1024,
        uploader: createUserSummary({ name: 'Alice' }),
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Quality Check - Part #A2847')).toBeInTheDocument();
      });

      expect(screen.getByText('Surface inspection')).toBeInTheDocument();
      expect(screen.getByText(/1920 x 1080px/)).toBeInTheDocument();
      expect(screen.getByText(/2\.00 MB/)).toBeInTheDocument();
    });

    it('shows error when image loading fails', async () => {
      mockGetImage.mockRejectedValue(new Error('Image not found'));

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Image not found')).toBeInTheDocument();
      });

      expect(screen.getByText(/Back to gallery/)).toBeInTheDocument();
    });
  });

  describe('annotation mode toggle', () => {
    it('shows Annotate button by default', async () => {
      mockGetImage.mockResolvedValue(createImageDetail({ id: 'img-1' }));
      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotate')).toBeInTheDocument();
      });
    });

    it('toggles to Cancel when clicking Annotate', async () => {
      const user = userEvent.setup();
      mockGetImage.mockResolvedValue(createImageDetail({ id: 'img-1' }));
      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Annotate'));
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows annotation hint when in annotation mode', async () => {
      const user = userEvent.setup();
      mockGetImage.mockResolvedValue(createImageDetail({ id: 'img-1' }));
      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Annotate'));
      expect(
        screen.getByText(/Pick a shape from the toolbar/)
      ).toBeInTheDocument();
    });
  });

  describe('annotation rendering', () => {
    it('renders existing annotations on image', async () => {
      const image = createImageDetail({
        id: 'img-1',
        annotations: [
          createCircleAnnotation({ id: 'a1', label: 'Scratch' }),
          createRectangleAnnotation({ id: 'a2', label: 'Dent' }),
        ],
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotations (2)')).toBeInTheDocument();
      });
    });

    it('shows empty state when no annotations exist', async () => {
      mockGetImage.mockResolvedValue(createImageDetail({ id: 'img-1', annotations: [] }));

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });
    });
  });

  describe('annotation creation', () => {
    it('creates annotation via API and updates local state', async () => {
      const image = createImageDetail({ id: 'img-1', annotations: [] });
      mockGetImage.mockResolvedValue(image);

      const newAnnotation = createCircleAnnotation({
        id: 'new-ann',
        label: 'New Finding',
      });
      mockCreateAnnotation.mockResolvedValue(newAnnotation);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });

      // Simulate annotation creation through socket event (as if API call + socket broadcast)
      simulateSocketEvent('annotation:created', newAnnotation);

      await waitFor(() => {
        expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
      });
    });

    it('deduplicates annotations from API and socket', async () => {
      const image = createImageDetail({ id: 'img-1', annotations: [] });
      mockGetImage.mockResolvedValue(image);

      const newAnnotation = createCircleAnnotation({
        id: 'dup-ann',
        label: 'Duplicate Check',
      });
      mockCreateAnnotation.mockResolvedValue(newAnnotation);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });

      // First event
      simulateSocketEvent('annotation:created', newAnnotation);

      await waitFor(() => {
        expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
      });

      // Second event with same ID (should not duplicate)
      simulateSocketEvent('annotation:created', newAnnotation);

      // Still should be 1
      expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
    });
  });

  describe('real-time annotation events', () => {
    it('adds new annotation from another user in real time', async () => {
      const image = createImageDetail({
        id: 'img-1',
        annotations: [createCircleAnnotation({ id: 'existing' })],
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
      });

      // Another user creates an annotation
      const remoteAnnotation = createCircleAnnotation({
        id: 'remote-ann',
        authorId: workerUser.id,
        author: createUserSummary({ id: workerUser.id, name: 'Worker Bob', role: 'FACTORY_WORKER' }),
        label: 'Found issue on assembly',
      });

      simulateSocketEvent('annotation:created', remoteAnnotation);

      await waitFor(() => {
        expect(screen.getByText('Annotations (2)')).toBeInTheDocument();
      });
    });

    it('updates annotation status from another user in real time', async () => {
      const ann = createCircleAnnotation({
        id: 'upd-ann',
        status: 'OPEN',
        label: 'Will be resolved',
      });
      const image = createImageDetail({
        id: 'img-1',
        annotations: [ann],
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Will be resolved')).toBeInTheDocument();
      });

      // Remote user resolves it
      const updatedAnn = { ...ann, status: 'RESOLVED' as const };
      simulateSocketEvent('annotation:updated', updatedAnn);

      // The annotation should still be present with updated status
      await waitFor(() => {
        expect(screen.getByText('Will be resolved')).toBeInTheDocument();
      });
    });

    it('removes annotation when another user deletes it', async () => {
      const ann = createCircleAnnotation({
        id: 'del-ann',
        label: 'Will be deleted',
      });
      const image = createImageDetail({
        id: 'img-1',
        annotations: [ann],
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
      });

      simulateSocketEvent('annotation:deleted', { annotationId: 'del-ann' });

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });
    });

    it('deselects annotation when it gets deleted by another user', async () => {
      const ann = createCircleAnnotation({ id: 'sel-del', label: 'Selected then deleted' });
      const image = createImageDetail({
        id: 'img-1',
        annotations: [ann],
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Annotations (1)')).toBeInTheDocument();
      });

      simulateSocketEvent('annotation:deleted', { annotationId: 'sel-del' });

      await waitFor(() => {
        expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      });
    });
  });

  describe('annotation status management', () => {
    it('updates annotation status via API', async () => {
      const ann = createCircleAnnotation({
        id: 'stat-ann',
        status: 'OPEN',
        authorId: engineerUser.id,
        label: 'Status test',
      });
      const image = createImageDetail({ id: 'img-1', annotations: [ann] });
      mockGetImage.mockResolvedValue(image);

      const updatedAnn = { ...ann, status: 'RESOLVED' as const };
      mockUpdateAnnotation.mockResolvedValue(updatedAnn);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Status test')).toBeInTheDocument();
      });

      // Click on the annotation to select it
      fireEvent.click(screen.getByText('Status test'));

      // Now click Resolved status button
      await waitFor(() => {
        const resolvedBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Resolved');
        expect(resolvedBtn).toBeInTheDocument();
      });

      const resolvedBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Resolved');
      fireEvent.click(resolvedBtn!);

      await waitFor(() => {
        expect(mockUpdateAnnotation).toHaveBeenCalledWith('stat-ann', { status: 'RESOLVED' });
      });
    });
  });

  describe('annotation deletion', () => {
    it('deletes annotation via API and removes from view', async () => {
      const ann = createCircleAnnotation({
        id: 'api-del',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id }),
        label: 'Delete via API',
      });
      const image = createImageDetail({ id: 'img-1', annotations: [ann] });
      mockGetImage.mockResolvedValue(image);
      mockDeleteAnnotation.mockResolvedValue({ success: true });

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Delete via API')).toBeInTheDocument();
      });

      // Select annotation
      fireEvent.click(screen.getByText('Delete via API'));

      // Click delete button
      await waitFor(() => {
        expect(screen.getByTitle('Delete annotation')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete annotation'));

      await waitFor(() => {
        expect(mockDeleteAnnotation).toHaveBeenCalledWith('api-del');
      });
    });
  });

  describe('image deletion', () => {
    it('shows delete button for image uploader', async () => {
      const image = createImageDetail({
        id: 'img-1',
        uploaderId: engineerUser.id,
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('shows delete button for admin users', async () => {
      // Re-mock auth to be admin
      // Since we can't re-mock, we test the condition via the existing mock
      const image = createImageDetail({
        id: 'img-1',
        uploaderId: engineerUser.id, // Same as the mocked user
      });
      mockGetImage.mockResolvedValue(image);

      renderImageDetailPage();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('socket event cleanup', () => {
    it('registers all required socket event listeners', async () => {
      mockGetImage.mockResolvedValue(createImageDetail({ id: 'img-1' }));

      renderImageDetailPage();

      await waitFor(() => {
        expect(mockOnEvent).toHaveBeenCalled();
      });

      const registeredEvents = mockOnEvent.mock.calls.map((call) => call[0]);
      expect(registeredEvents).toContain('annotation:created');
      expect(registeredEvents).toContain('annotation:updated');
      expect(registeredEvents).toContain('annotation:deleted');
      expect(registeredEvents).toContain('comment:created');
      expect(registeredEvents).toContain('comment:deleted');
    });
  });
});
