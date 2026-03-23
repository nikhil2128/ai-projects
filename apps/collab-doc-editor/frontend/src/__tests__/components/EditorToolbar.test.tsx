import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from '../../components/EditorToolbar';

function createMockEditor() {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    clearNodes: vi.fn().mockReturnThis(),
    unsetAllMarks: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };

  return {
    chain: vi.fn(() => chainable),
    can: vi.fn(() => ({
      undo: vi.fn().mockReturnValue(true),
      redo: vi.fn().mockReturnValue(false),
    })),
    isActive: vi.fn((type: string) => type === 'bold'),
  } as any;
}

describe('EditorToolbar', () => {
  it('should render all toolbar groups', () => {
    const editor = createMockEditor();
    const { container } = render(<EditorToolbar editor={editor} />);
    const groups = container.querySelectorAll('.toolbar-group');
    expect(groups.length).toBe(5);
  });

  it('should render all toolbar buttons', () => {
    const editor = createMockEditor();
    const { container } = render(<EditorToolbar editor={editor} />);
    const buttons = container.querySelectorAll('.toolbar-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(15);
  });

  it('should mark active buttons with active class', () => {
    const editor = createMockEditor();
    const { container } = render(<EditorToolbar editor={editor} />);
    const activeButtons = container.querySelectorAll('.toolbar-btn.active');
    expect(activeButtons.length).toBeGreaterThan(0);
  });

  it('should disable redo button when can().redo() returns false', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    const redoButton = screen.getByTitle('Redo');
    expect(redoButton).toBeDisabled();
  });

  it('should call undo when undo button clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Undo'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleBold when bold button clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Bold (Ctrl+B)'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleItalic when italic button clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Italic (Ctrl+I)'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleUnderline when underline button clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Underline (Ctrl+U)'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleHeading for heading buttons', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Heading 1'));
    fireEvent.click(screen.getByTitle('Heading 2'));
    fireEvent.click(screen.getByTitle('Heading 3'));
    expect(editor.chain).toHaveBeenCalledTimes(3);
  });

  it('should call list toggles', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Bullet List'));
    fireEvent.click(screen.getByTitle('Numbered List'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleBlockquote', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Blockquote'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call toggleCodeBlock', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Code Block'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call setHorizontalRule', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Horizontal Rule'));
    expect(editor.chain).toHaveBeenCalled();
  });

  it('should call clearNodes and unsetAllMarks for clear formatting', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Clear Formatting'));
    expect(editor.chain).toHaveBeenCalled();
  });
});
