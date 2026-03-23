import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockEditorValue: any = null;

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditorValue),
  EditorContent: vi.fn(({ editor }: any) =>
    editor ? <div data-testid="editor-content">Editor Content</div> : null
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock('@tiptap/extension-collaboration', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock('@tiptap/extension-collaboration-cursor', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock('@tiptap/extension-underline', () => ({
  default: {},
}));

vi.mock('@tiptap/extension-highlight', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock('@tiptap/extension-text-style', () => ({
  default: {},
}));

vi.mock('@tiptap/extension-color', () => ({
  default: {},
}));

vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock('../../components/EditorToolbar', () => ({
  EditorToolbar: () => <div data-testid="toolbar">Toolbar</div>,
}));

import { CollaborativeEditor } from '../../components/CollaborativeEditor';
import * as Y from 'yjs';

describe('CollaborativeEditor', () => {
  it('should show loading state when editor is not ready', () => {
    mockEditorValue = null;

    const ydoc = new Y.Doc();
    const { container } = render(
      <CollaborativeEditor ydoc={ydoc} provider={null} user={{ name: 'Test', color: '#FF6B6B' }} />
    );

    expect(container.querySelector('.editor-loading')).toBeTruthy();
    ydoc.destroy();
  });

  it('should render editor when ready', () => {
    mockEditorValue = {
      chain: vi.fn().mockReturnThis(),
      can: vi.fn().mockReturnValue({ undo: vi.fn(), redo: vi.fn() }),
      isActive: vi.fn(),
    };

    const ydoc = new Y.Doc();
    render(
      <CollaborativeEditor ydoc={ydoc} provider={null} user={{ name: 'Test', color: '#FF6B6B' }} />
    );

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    ydoc.destroy();
  });

  it('should render with provider', () => {
    mockEditorValue = {
      chain: vi.fn().mockReturnThis(),
      can: vi.fn().mockReturnValue({ undo: vi.fn(), redo: vi.fn() }),
      isActive: vi.fn(),
    };

    const ydoc = new Y.Doc();
    const mockProvider = {
      awareness: {
        setLocalStateField: vi.fn(),
        getStates: vi.fn().mockReturnValue(new Map()),
        on: vi.fn(),
        off: vi.fn(),
      },
    } as any;

    render(
      <CollaborativeEditor
        ydoc={ydoc}
        provider={mockProvider}
        user={{ name: 'Test', color: '#FF6B6B' }}
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    ydoc.destroy();
  });
});
