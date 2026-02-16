import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorToolbar } from './EditorToolbar';

interface CollaborativeEditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  user: { name: string; color: string };
}

export function CollaborativeEditor({ ydoc, provider, user }: CollaborativeEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Underline,
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        Placeholder.configure({
          placeholder: 'Start typing... Your changes are synced in real-time with all collaborators.',
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        ...(provider
          ? [
              CollaborationCursor.configure({
                provider,
                user: {
                  name: user.name,
                  color: user.color,
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class: 'prose-editor',
        },
      },
    },
    [ydoc, provider]
  );

  if (!editor) {
    return (
      <div className="editor-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="collaborative-editor">
      <EditorToolbar editor={editor} />
      <div className="editor-scroll-area">
        <div className="editor-paper">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
