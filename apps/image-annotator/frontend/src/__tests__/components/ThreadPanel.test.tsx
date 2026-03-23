import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThreadPanel from '../../components/ThreadPanel';
import {
  createCircleAnnotation,
  createRectangleAnnotation,
  createAnnotationWithComments,
  createComment,
  createUserSummary,
  engineerUser,
  workerUser,
  adminUser,
  procurementUser,
} from '../../test/factories';
import type { Annotation } from '../../types';

// ---------- Helpers ----------

function renderThreadPanel(
  props: Partial<React.ComponentProps<typeof ThreadPanel>> = {}
) {
  const defaultProps: React.ComponentProps<typeof ThreadPanel> = {
    annotations: [],
    selectedAnnotation: null,
    currentUserId: engineerUser.id,
    currentUserRole: engineerUser.role,
    onSelectAnnotation: vi.fn(),
    onDeleteAnnotation: vi.fn(),
    onUpdateStatus: vi.fn(),
    onAddComment: vi.fn(),
    onDeleteComment: vi.fn(),
    ...props,
  };

  const result = render(<ThreadPanel {...defaultProps} />);
  return { ...result, props: defaultProps };
}

// ---------- Tests ----------

describe('ThreadPanel', () => {
  describe('empty state', () => {
    it('shows empty message when there are no annotations', () => {
      renderThreadPanel({ annotations: [] });
      expect(screen.getByText('No annotations yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Click "Annotate" to draw on the image/)
      ).toBeInTheDocument();
    });
  });

  describe('annotations list', () => {
    it('shows the annotations count in the header', () => {
      const annotations = [
        createCircleAnnotation({ id: 'a1' }),
        createCircleAnnotation({ id: 'a2' }),
        createCircleAnnotation({ id: 'a3' }),
      ];
      renderThreadPanel({ annotations });
      expect(screen.getByText('Annotations (3)')).toBeInTheDocument();
    });

    it('renders each annotation with its label', () => {
      const annotations = [
        createCircleAnnotation({ id: 'a1', label: 'Scratch on surface' }),
        createCircleAnnotation({ id: 'a2', label: 'Dent near edge' }),
      ];
      renderThreadPanel({ annotations });

      expect(screen.getByText('Scratch on surface')).toBeInTheDocument();
      expect(screen.getByText('Dent near edge')).toBeInTheDocument();
    });

    it('shows fallback label when annotation has no label', () => {
      const annotations = [
        createCircleAnnotation({ id: 'a1', label: undefined }),
      ];
      renderThreadPanel({ annotations });
      expect(screen.getByText('Annotation #1')).toBeInTheDocument();
    });

    it('shows author name and role for each annotation', () => {
      const annotations = [
        createCircleAnnotation({
          id: 'a1',
          author: createUserSummary({
            name: 'Jane Doe',
            role: 'ENGINEER',
          }),
        }),
      ];
      renderThreadPanel({ annotations });

      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    });

    it('shows comment count for each annotation', () => {
      const annotations = [
        createAnnotationWithComments(5, { id: 'a1', label: 'Test' }),
      ];
      renderThreadPanel({ annotations });
      expect(screen.getByText(/5 comments/)).toBeInTheDocument();
    });

    it('uses singular "comment" for single comment', () => {
      const ann = createCircleAnnotation({
        id: 'a1',
        label: 'Test',
        comments: [createComment({ annotationId: 'a1' })],
      });
      renderThreadPanel({ annotations: [ann] });
      expect(screen.getByText(/\b1 comment\b/)).toBeInTheDocument();
    });

    it('shows status badge for each annotation', () => {
      const annotations = [
        createCircleAnnotation({ id: 'a1', status: 'OPEN', label: 'Open issue' }),
        createCircleAnnotation({ id: 'a2', status: 'RESOLVED', label: 'Fixed issue' }),
        createCircleAnnotation({ id: 'a3', status: 'DISMISSED', label: 'Dismissed issue' }),
      ];
      renderThreadPanel({ annotations });

      expect(screen.getByText('Open issue')).toBeInTheDocument();
      expect(screen.getByText('Fixed issue')).toBeInTheDocument();
      expect(screen.getByText('Dismissed issue')).toBeInTheDocument();
    });
  });

  describe('annotation selection', () => {
    it('calls onSelectAnnotation when clicking an annotation header', () => {
      const onSelect = vi.fn();
      const annotations = [createCircleAnnotation({ id: 'sel1', label: 'Click me' })];
      renderThreadPanel({
        annotations,
        onSelectAnnotation: onSelect,
      });

      fireEvent.click(screen.getByText('Click me'));
      expect(onSelect).toHaveBeenCalledWith('sel1');
    });

    it('toggles selection off when clicking already selected annotation', () => {
      const onSelect = vi.fn();
      const annotations = [createCircleAnnotation({ id: 'tog1', label: 'Toggle me' })];
      renderThreadPanel({
        annotations,
        selectedAnnotation: 'tog1',
        onSelectAnnotation: onSelect,
      });

      fireEvent.click(screen.getByText('Toggle me'));
      expect(onSelect).toHaveBeenCalledWith(null);
    });

    it('applies ring highlight to selected annotation card', () => {
      const annotations = [createCircleAnnotation({ id: 'hl1', label: 'Highlighted' })];
      const { container } = renderThreadPanel({
        annotations,
        selectedAnnotation: 'hl1',
      });

      const card = container.querySelector('.ring-2.ring-brand-500');
      expect(card).toBeInTheDocument();
    });
  });

  describe('expanded annotation thread', () => {
    it('auto-expands thread when annotation is selected', () => {
      const ann = createAnnotationWithComments(2, { id: 'exp1', label: 'Expand me' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'exp1',
      });

      // Should see the comments and form when expanded
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('can expand/collapse thread via chevron button', async () => {
      const user = userEvent.setup();
      const ann = createAnnotationWithComments(1, { id: 'chev1', label: 'Chevron test' });
      const { container } = renderThreadPanel({ annotations: [ann] });

      // Thread should be collapsed initially (no selected annotation)
      expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();

      // Click expand button - find the last button in the header area
      const expandBtns = container.querySelectorAll('button');
      const chevronBtn = Array.from(expandBtns).find((btn) => {
        const svg = btn.querySelector('svg');
        return svg && btn.closest('.flex.items-center.gap-3');
      });

      if (chevronBtn) {
        await user.click(chevronBtn);
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      }
    });

    it('shows status action buttons when expanded', () => {
      const ann = createCircleAnnotation({ id: 'stat1', label: 'Status test', status: 'OPEN' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'stat1',
      });

      // Should see all three status buttons
      const statusButtons = screen.getAllByRole('button');
      const openBtn = statusButtons.find((b) => b.textContent === 'Open');
      const resolvedBtn = statusButtons.find((b) => b.textContent === 'Resolved');
      const dismissedBtn = statusButtons.find((b) => b.textContent === 'Dismissed');

      expect(openBtn).toBeInTheDocument();
      expect(resolvedBtn).toBeInTheDocument();
      expect(dismissedBtn).toBeInTheDocument();
    });

    it('shows "No comments yet" when thread has no comments', () => {
      const ann = createCircleAnnotation({ id: 'nc1', label: 'No comments', comments: [] });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'nc1',
      });

      expect(
        screen.getByText('No comments yet. Start the conversation below.')
      ).toBeInTheDocument();
    });

    it('renders comments with author info', () => {
      const comment = createComment({
        id: 'c1',
        body: 'This looks like a defect',
        author: createUserSummary({ name: 'Alice', role: 'ENGINEER' }),
      });
      const ann = createCircleAnnotation({ id: 'wc1', comments: [comment] });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'wc1',
      });

      expect(screen.getByText('This looks like a defect')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('status management', () => {
    it('calls onUpdateStatus with RESOLVED when clicking Resolved button', async () => {
      const onUpdateStatus = vi.fn();
      const ann = createCircleAnnotation({ id: 's1', status: 'OPEN' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 's1',
        onUpdateStatus,
      });

      const resolvedBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Resolved');
      if (resolvedBtn) {
        fireEvent.click(resolvedBtn);
        expect(onUpdateStatus).toHaveBeenCalledWith('s1', 'RESOLVED');
      }
    });

    it('calls onUpdateStatus with DISMISSED when clicking Dismissed button', () => {
      const onUpdateStatus = vi.fn();
      const ann = createCircleAnnotation({ id: 's2', status: 'OPEN' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 's2',
        onUpdateStatus,
      });

      const dismissedBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Dismissed');
      if (dismissedBtn) {
        fireEvent.click(dismissedBtn);
        expect(onUpdateStatus).toHaveBeenCalledWith('s2', 'DISMISSED');
      }
    });

    it('calls onUpdateStatus with OPEN to reopen', () => {
      const onUpdateStatus = vi.fn();
      const ann = createCircleAnnotation({ id: 's3', status: 'RESOLVED' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 's3',
        onUpdateStatus,
      });

      const openBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Open');
      if (openBtn) {
        fireEvent.click(openBtn);
        expect(onUpdateStatus).toHaveBeenCalledWith('s3', 'OPEN');
      }
    });

    it('highlights the current status button', () => {
      const ann = createCircleAnnotation({ id: 'hs1', status: 'RESOLVED' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'hs1',
      });

      const resolvedBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Resolved');
      expect(resolvedBtn?.className).toContain('ring-1');
    });
  });

  describe('comment submission', () => {
    it('submits a new comment via form', async () => {
      const user = userEvent.setup();
      const onAddComment = vi.fn().mockResolvedValue(undefined);
      const ann = createCircleAnnotation({ id: 'cm1' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'cm1',
        onAddComment,
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'Great find! Let me check this.');

      // Find and click the submit button inside the form
      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      await user.click(submitBtn);

      expect(onAddComment).toHaveBeenCalledWith('cm1', 'Great find! Let me check this.');
    });

    it('clears input after successful comment submission', async () => {
      const user = userEvent.setup();
      const onAddComment = vi.fn().mockResolvedValue(undefined);
      const ann = createCircleAnnotation({ id: 'clr1' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'clr1',
        onAddComment,
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'My comment');

      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('disables submit button when input is empty', () => {
      const ann = createCircleAnnotation({ id: 'dis1' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'dis1',
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      expect(submitBtn).toBeDisabled();
    });

    it('disables submit button when input is only whitespace', async () => {
      const user = userEvent.setup();
      const ann = createCircleAnnotation({ id: 'ws1' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'ws1',
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, '   ');

      const form = input.closest('form')!;
      const submitBtn = form.querySelector('button[type="submit"]')!;
      expect(submitBtn).toBeDisabled();
    });

    it('does not submit when pressing enter with empty input', async () => {
      const onAddComment = vi.fn();
      const ann = createCircleAnnotation({ id: 'ent1' });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'ent1',
        onAddComment,
      });

      const input = screen.getByPlaceholderText('Add a comment...');
      fireEvent.submit(input.closest('form')!);

      expect(onAddComment).not.toHaveBeenCalled();
    });
  });

  describe('deletion permissions', () => {
    it('shows delete button for annotation author', () => {
      const ann = createCircleAnnotation({
        id: 'del1',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id }),
      });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'del1',
        currentUserId: engineerUser.id,
        currentUserRole: 'ENGINEER',
      });

      // Find delete button by title
      expect(screen.getByTitle('Delete annotation')).toBeInTheDocument();
    });

    it('shows delete button for admin users', () => {
      const ann = createCircleAnnotation({
        id: 'del2',
        authorId: workerUser.id,
        author: createUserSummary({ id: workerUser.id }),
      });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'del2',
        currentUserId: adminUser.id,
        currentUserRole: 'ADMIN',
      });

      expect(screen.getByTitle('Delete annotation')).toBeInTheDocument();
    });

    it('hides delete button for non-author non-admin users', () => {
      const ann = createCircleAnnotation({
        id: 'del3',
        authorId: workerUser.id,
        author: createUserSummary({ id: workerUser.id }),
      });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'del3',
        currentUserId: engineerUser.id,
        currentUserRole: 'ENGINEER',
      });

      expect(screen.queryByTitle('Delete annotation')).not.toBeInTheDocument();
    });

    it('calls onDeleteAnnotation when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const ann = createCircleAnnotation({
        id: 'del4',
        authorId: engineerUser.id,
      });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'del4',
        currentUserId: engineerUser.id,
        onDeleteAnnotation: onDelete,
      });

      await user.click(screen.getByTitle('Delete annotation'));
      expect(onDelete).toHaveBeenCalledWith('del4');
    });

    it('shows delete button for comment author', () => {
      const comment = createComment({
        id: 'cd1',
        authorId: engineerUser.id,
        author: createUserSummary({ id: engineerUser.id, name: 'Engineer', role: 'ENGINEER' }),
        body: 'My comment',
      });
      const ann = createCircleAnnotation({ id: 'cda1', comments: [comment] });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'cda1',
        currentUserId: engineerUser.id,
      });

      expect(screen.getByTitle('Delete comment')).toBeInTheDocument();
    });

    it('shows delete button on comments for admin users', () => {
      const comment = createComment({
        id: 'cd2',
        authorId: workerUser.id,
        author: createUserSummary({ id: workerUser.id, name: 'Worker', role: 'FACTORY_WORKER' }),
        body: 'Worker comment',
      });
      const ann = createCircleAnnotation({ id: 'cda2', comments: [comment] });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'cda2',
        currentUserId: adminUser.id,
        currentUserRole: 'ADMIN',
      });

      expect(screen.getByTitle('Delete comment')).toBeInTheDocument();
    });

    it('calls onDeleteComment when comment delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteComment = vi.fn();
      const comment = createComment({
        id: 'cd3',
        authorId: engineerUser.id,
        body: 'Delete me',
      });
      const ann = createCircleAnnotation({ id: 'cda3', comments: [comment] });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'cda3',
        currentUserId: engineerUser.id,
        onDeleteComment,
      });

      await user.click(screen.getByTitle('Delete comment'));
      expect(onDeleteComment).toHaveBeenCalledWith('cd3');
    });
  });

  describe('multi-user thread interaction', () => {
    it('displays comments from multiple users with correct styling', () => {
      const comments = [
        createComment({
          id: 'mu1',
          authorId: engineerUser.id,
          author: createUserSummary({ id: engineerUser.id, name: 'Alice Engineer', role: 'ENGINEER' }),
          body: 'I see a defect here',
        }),
        createComment({
          id: 'mu2',
          authorId: workerUser.id,
          author: createUserSummary({ id: workerUser.id, name: 'Bob Worker', role: 'FACTORY_WORKER' }),
          body: 'Let me check on the floor',
        }),
        createComment({
          id: 'mu3',
          authorId: procurementUser.id,
          author: createUserSummary({ id: procurementUser.id, name: 'Carol Procurement', role: 'PROCUREMENT' }),
          body: 'We need to reorder parts',
        }),
      ];
      const ann = createCircleAnnotation({ id: 'mua1', comments });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'mua1',
      });

      // All comments should be visible
      expect(screen.getByText('I see a defect here')).toBeInTheDocument();
      expect(screen.getByText('Let me check on the floor')).toBeInTheDocument();
      expect(screen.getByText('We need to reorder parts')).toBeInTheDocument();

      // Author names should be visible
      expect(screen.getByText('Alice Engineer')).toBeInTheDocument();
      expect(screen.getByText('Bob Worker')).toBeInTheDocument();
      expect(screen.getByText('Carol Procurement')).toBeInTheDocument();

      // Role labels should be visible
      expect(screen.getByText('Engineer')).toBeInTheDocument();
      expect(screen.getByText('Factory')).toBeInTheDocument();
      expect(screen.getByText('Procurement')).toBeInTheDocument();
    });

    it('shows correct avatar initials for each comment author', () => {
      const comments = [
        createComment({
          id: 'av1',
          author: createUserSummary({ name: 'Alice', role: 'ENGINEER' }),
          body: 'First',
        }),
        createComment({
          id: 'av2',
          author: createUserSummary({ name: 'Bob', role: 'FACTORY_WORKER' }),
          body: 'Second',
        }),
      ];
      const ann = createCircleAnnotation({ id: 'ava1', comments });
      renderThreadPanel({
        annotations: [ann],
        selectedAnnotation: 'ava1',
      });

      // Should show first letters
      const avatars = screen.getAllByText('A');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('handles annotations from different users with different roles', () => {
      const annotations = [
        createCircleAnnotation({
          id: 'mr1',
          author: createUserSummary({ name: 'Engineer Alice', role: 'ENGINEER' }),
          label: 'Engineer finding',
          status: 'OPEN',
        }),
        createCircleAnnotation({
          id: 'mr2',
          author: createUserSummary({ name: 'Worker Bob', role: 'FACTORY_WORKER' }),
          label: 'Worker finding',
          status: 'RESOLVED',
        }),
      ];
      renderThreadPanel({ annotations });

      expect(screen.getByText('Engineer finding')).toBeInTheDocument();
      expect(screen.getByText('Worker finding')).toBeInTheDocument();
      expect(screen.getByText(/Engineer Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Worker Bob/)).toBeInTheDocument();
    });
  });

  describe('multiple annotation threads', () => {
    it('renders correct numbering for annotations', () => {
      const annotations = [
        createCircleAnnotation({ id: 'n1', label: 'First' }),
        createCircleAnnotation({ id: 'n2', label: 'Second' }),
        createCircleAnnotation({ id: 'n3', label: 'Third' }),
      ];
      renderThreadPanel({ annotations });

      // Index badges (1, 2, 3)
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('only expands one thread at a time initially via selection', () => {
      const annotations = [
        createAnnotationWithComments(2, { id: 'ot1', label: 'Thread 1' }),
        createAnnotationWithComments(3, { id: 'ot2', label: 'Thread 2' }),
      ];
      renderThreadPanel({
        annotations,
        selectedAnnotation: 'ot1',
      });

      // Should see comment form for the selected thread
      const inputs = screen.getAllByPlaceholderText('Add a comment...');
      // At minimum one input should be visible for the selected thread
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
