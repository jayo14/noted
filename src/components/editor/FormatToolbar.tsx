import React from "react";
import type { Editor } from "@tiptap/core";
import type { Collection } from "@/types";
import { CollectionSelector } from "@/components/collections/CollectionSelector";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Pin,
  Trash2,
  Download,
  Copy,
  ArrowLeft,
} from "lucide-react";

interface FormatToolbarProps {
  editor: Editor | null;
  isPinned?: boolean;
  collectionId?: string | null;
  collections?: Collection[];
  onSelectCollection?: (colId: string | null) => void;
  onCreateCollection?: (name: string) => Promise<void>;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  editor,
  isPinned = false,
  collectionId = null,
  collections = [],
  onSelectCollection,
  onCreateCollection,
  onTogglePin,
  onDuplicate,
  onDelete,
  onExport,
  onBack,
  isMobile = false,
}) => {
  if (!editor) return null;

  return (
    <div className="flex w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/95 px-3 py-2 backdrop-blur-sm">
      {/* Left controls */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {isMobile && onBack && (
          <button
            onClick={onBack}
            className="mr-1.5 flex items-center gap-1 rounded-md p-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
            title="Back to notes list"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {/* Collection Selector */}
        {onSelectCollection && (
          <>
            <CollectionSelector
              collections={collections}
              selectedCollectionId={collectionId}
              onSelectCollection={onSelectCollection}
              onCreateCollection={onCreateCollection}
            />
            <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />
          </>
        )}

        {/* Undo / Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={15} />
        </button>

        <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("heading", { level: 1 })
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Heading 1"
        >
          <Heading1 size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("heading", { level: 2 })
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Heading 2"
        >
          <Heading2 size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("heading", { level: 3 })
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Heading 3"
        >
          <Heading3 size={15} />
        </button>

        <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("bold")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Bold (Cmd+B)"
        >
          <Bold size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("italic")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Italic (Cmd+I)"
        >
          <Italic size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("underline")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("strike")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("code")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Inline Code"
        >
          <Code size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("highlight")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Highlight"
        >
          <Highlighter size={15} />
        </button>

        <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("taskList")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Checklist"
        >
          <CheckSquare size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("bulletList")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Bullet List"
        >
          <List size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("orderedList")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded p-1.5 transition-colors ${
            editor.isActive("blockquote")
              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Quote"
        >
          <Quote size={15} />
        </button>

        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
          title="Horizontal Divider"
        >
          <Minus size={15} />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 pl-2">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={`rounded p-1.5 transition-colors ${
              isPinned
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            }`}
            title={isPinned ? "Unpin note" : "Pin note"}
          >
            <Pin size={15} />
          </button>
        )}

        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
            title="Duplicate note"
          >
            <Copy size={15} />
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
            title="Export note"
          >
            <Download size={15} />
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-red-500 transition-colors"
            title="Delete note"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
