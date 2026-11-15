import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  MoreVertical,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  CheckSquare,
  Pin,
  Trash2,
  Copy,
  Share2,
  Download,
  Folder,
} from "lucide-react";
import { MobileInsertSheet } from "./MobileInsertSheet";
import type { Collection } from "@/types";

interface MobileEditorProps {
  editor: Editor | null;
  title: string;
  onTitleChange: (newTitle: string) => void;
  onBack: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  collections?: Collection[];
  collectionId?: string | null;
  onSelectCollection?: (colId: string | null) => void;
  isReadOnly?: boolean;
}

export const MobileEditor: React.FC<MobileEditorProps> = ({
  editor,
  title,
  onTitleChange,
  onBack,
  isPinned = false,
  onTogglePin,
  onDuplicate,
  onDelete,
  onShare,
  onExport,
  collections = [],
  collectionId = null,
  onSelectCollection,
  isReadOnly = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInsertSheetOpen, setIsInsertSheetOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title if empty untitled note
  useEffect(() => {
    if (!title || title === "Untitled") {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    }
  }, []);

  if (!editor) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--bg-editor)] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Header Row matching Image 1 */}
      <header className="flex h-14 w-full items-center justify-between border-b border-[var(--border-subtle)]/40 bg-[var(--bg-editor)] px-4">
        {/* Left: Back button matching Image 1 */}
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-90 transition-all cursor-pointer"
          aria-label="Back to notes"
        >
          <ArrowLeft size={21} strokeWidth={2.2} />
        </button>

        {/* Center: Undo & Redo buttons matching Image 1 */}
        <div className="flex items-center gap-4 text-[var(--text-primary)]">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1 text-[var(--text-primary)] disabled:text-[var(--text-subtle)]/40 hover:bg-[var(--bg-surface)] rounded-full transition-colors cursor-pointer"
            aria-label="Undo"
          >
            <Undo2 size={20} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1 text-[var(--text-primary)] disabled:text-[var(--text-subtle)]/40 hover:bg-[var(--bg-surface)] rounded-full transition-colors cursor-pointer"
            aria-label="Redo"
          >
            <Redo2 size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Right: More Menu matching Image 1 */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-90 transition-all cursor-pointer"
            aria-label="Note options"
          >
            <MoreVertical size={20} strokeWidth={2.2} />
          </button>

          {/* More menu dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-40 w-48 rounded-2xl bg-[var(--bg-editor)] border border-[var(--border-subtle)] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[13px]">
                {onTogglePin && (
                  <button
                    onClick={() => {
                      onTogglePin();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
                  >
                    <Pin size={15} />
                    <span>{isPinned ? "Unpin Note" : "Pin Note"}</span>
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
                  >
                    <Copy size={15} />
                    <span>Duplicate</span>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={() => {
                      onShare();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
                  >
                    <Share2 size={15} />
                    <span>Share Note</span>
                  </button>
                )}
                {onExport && (
                  <button
                    onClick={() => {
                      onExport();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Export Markdown</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="my-1 border-t border-[var(--border-subtle)]" />
                    <button
                      onClick={() => {
                        onDelete();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Delete Note</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Writing Canvas Scrollable Area matching Image 1 */}
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-32 select-text no-scrollbar">
        {/* Note Title matching Image 1: Editorial Serif with blinking cursor */}
        <div className="mb-4">
          <input
            ref={titleInputRef}
            type="text"
            value={title === "Untitled" ? "" : title}
            placeholder="Ideas for Kova"
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={isReadOnly}
            className="w-full bg-transparent text-[30px] font-bold font-serif-title tracking-tight text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none border-none p-0 focus:ring-0 leading-tight"
          />
        </div>

        {/* Tiptap Editor Content matching Image 1 */}
        <div className="text-[16px] leading-relaxed text-[var(--text-primary)]">
          <EditorContent editor={editor} className="tiptap-container" />
        </div>
      </div>

      {/* Floating Formatting Toolbar matching Image 1: Aa, B, I, U, S, Bullet, Checklist */}
      <div className="fixed bottom-4 left-4 right-4 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex h-11 items-center justify-between gap-1.5 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md px-3.5 py-1 border border-[var(--border-subtle)] shadow-lg text-[var(--text-primary)]">
          {/* "Aa" button opens Block Inserter (Image 2) */}
          <button
            onClick={() => setIsInsertSheetOpen(true)}
            className="flex h-8 px-2.5 items-center justify-center rounded-full text-[13px] font-bold tracking-tight hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all cursor-pointer"
            title="Insert block"
          >
            Aa
          </button>

          <div className="h-4 w-px bg-[var(--border-strong)] mx-0.5 opacity-60" />

          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("bold")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Bold"
          >
            <Bold size={15} strokeWidth={2.5} />
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("italic")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Italic"
          >
            <Italic size={15} strokeWidth={2.5} />
          </button>

          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("underline")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Underline"
          >
            <UnderlineIcon size={15} strokeWidth={2.5} />
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("strike")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={15} strokeWidth={2.5} />
          </button>

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Bullet list"
          >
            <List size={16} strokeWidth={2.5} />
          </button>

          {/* Checklist */}
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
            }`}
            title="Checklist"
          >
            <CheckSquare size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Screen 3 Bottom Sheet */}
      <MobileInsertSheet
        isOpen={isInsertSheetOpen}
        onClose={() => setIsInsertSheetOpen(false)}
        editor={editor}
      />
    </div>
  );
};
