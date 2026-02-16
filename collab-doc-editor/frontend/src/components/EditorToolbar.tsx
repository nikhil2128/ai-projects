import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Highlighter,
  CodeSquare,
  RemoveFormatting,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  interface ToolbarItem {
    icon: React.ReactNode;
    title: string;
    action: () => boolean | void;
    active?: boolean;
    disabled?: boolean;
  }

  const toolbarGroups: { label: string; items: ToolbarItem[] }[] = [
    {
      label: 'History',
      items: [
        {
          icon: <Undo2 size={16} />,
          title: 'Undo',
          action: () => editor.chain().focus().undo().run(),
          disabled: !editor.can().undo(),
        },
        {
          icon: <Redo2 size={16} />,
          title: 'Redo',
          action: () => editor.chain().focus().redo().run(),
          disabled: !editor.can().redo(),
        },
      ],
    },
    {
      label: 'Headings',
      items: [
        {
          icon: <Heading1 size={16} />,
          title: 'Heading 1',
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive('heading', { level: 1 }),
        },
        {
          icon: <Heading2 size={16} />,
          title: 'Heading 2',
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive('heading', { level: 2 }),
        },
        {
          icon: <Heading3 size={16} />,
          title: 'Heading 3',
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          active: editor.isActive('heading', { level: 3 }),
        },
      ],
    },
    {
      label: 'Formatting',
      items: [
        {
          icon: <Bold size={16} />,
          title: 'Bold (Ctrl+B)',
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive('bold'),
        },
        {
          icon: <Italic size={16} />,
          title: 'Italic (Ctrl+I)',
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive('italic'),
        },
        {
          icon: <Underline size={16} />,
          title: 'Underline (Ctrl+U)',
          action: () => editor.chain().focus().toggleUnderline().run(),
          active: editor.isActive('underline'),
        },
        {
          icon: <Strikethrough size={16} />,
          title: 'Strikethrough',
          action: () => editor.chain().focus().toggleStrike().run(),
          active: editor.isActive('strike'),
        },
        {
          icon: <Code size={16} />,
          title: 'Inline Code',
          action: () => editor.chain().focus().toggleCode().run(),
          active: editor.isActive('code'),
        },
        {
          icon: <Highlighter size={16} />,
          title: 'Highlight',
          action: () => editor.chain().focus().toggleHighlight().run(),
          active: editor.isActive('highlight'),
        },
      ],
    },
    {
      label: 'Lists & Blocks',
      items: [
        {
          icon: <List size={16} />,
          title: 'Bullet List',
          action: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive('bulletList'),
        },
        {
          icon: <ListOrdered size={16} />,
          title: 'Numbered List',
          action: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive('orderedList'),
        },
        {
          icon: <Quote size={16} />,
          title: 'Blockquote',
          action: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive('blockquote'),
        },
        {
          icon: <CodeSquare size={16} />,
          title: 'Code Block',
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          active: editor.isActive('codeBlock'),
        },
        {
          icon: <Minus size={16} />,
          title: 'Horizontal Rule',
          action: () => editor.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
    {
      label: 'Clear',
      items: [
        {
          icon: <RemoveFormatting size={16} />,
          title: 'Clear Formatting',
          action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
        },
      ],
    },
  ];

  return (
    <div className="editor-toolbar">
      {toolbarGroups.map((group, gi) => (
        <div key={gi} className="toolbar-group">
          {group.items.map((item, ii) => (
            <button
              key={ii}
              className={`toolbar-btn ${item.active ? 'active' : ''}`}
              onClick={item.action}
              disabled={item.disabled}
              title={item.title}
            >
              {item.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
