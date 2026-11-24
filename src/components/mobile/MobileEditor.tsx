import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import {
  ChevronLeft,
  MoreHorizontal,
  Check,
  Share2,
  Table as TableIcon,
  Paperclip,
  List,
  ListTodo,
  TextQuote,
  Pin,
  Trash2,
  Copy,
  Download,
  Sparkles,
} from "lucide-react";
import { MobileInsertSheet } from "./MobileInsertSheet";
import { EditorBubbleMenu } from "@/components/editor/EditorBubbleMenu";
import { Icon } from "@/components/ui/Icon";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import type { Collection } from "@/types";
import { settingsService } from "@/services/settingsService";

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
  onCheckForUpdates?: () => void;
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
  isReadOnly = false,
  onCheckForUpdates,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInsertSheetOpen, setIsInsertSheetOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => settingsService.getPreferences());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return settingsService.subscribe(setPrefs);
  }, []);

  // Track virtual keyboard visibility and height via window.visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Distance from visual viewport bottom to window innerHeight
      const bottomOffset = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      const isKeyboardByOffset = bottomOffset > 100;

      // Check if any editor element or input is focused
      const isFocused =
        editor?.isFocused ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        Boolean(document.activeElement?.closest(".tiptap"));

      const isKeyboardByScreen =
        Boolean(window.screen?.height && window.screen.height - vv.height > 160) &&
        Boolean(isFocused);

      const isOpen = isKeyboardByOffset || isKeyboardByScreen;

      setIsKeyboardOpen(isOpen);
      setKeyboardHeight(isKeyboardByOffset ? bottomOffset : 0);
    };

    const vv = window.visualViewport;
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);

    editor?.on("focus", handleViewportChange);
    editor?.on("blur", handleViewportChange);

    handleViewportChange();

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      editor?.off("focus", handleViewportChange);
      editor?.off("blur", handleViewportChange);
    };
  }, [editor]);

  // Auto-focus title if empty untitled note
  useEffect(() => {
    if (!title || title === "Untitled") {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    }
  }, []);

  const currentCollection = useMemo(
    () => collections.find((c) => c.id === collectionId),
    [collections, collectionId],
  );

  const contextMeta = useMemo(
    () =>
      classifyNoteIcon(
        {
          id: "active",
          user_id: "",
          title,
          content: editor?.getJSON() || { type: "doc", content: [] },
          collection_id: collectionId,
          is_pinned: isPinned,
          created_at: "",
          updated_at: "",
          deleted_at: null,
          revision: 1,
        },
        currentCollection?.name,
      ),
    [title, editor, collectionId, isPinned, currentCollection?.name],
  );

  if (!editor) return null;

  // Clean pasted title text (stripping leading markdown header tags)
  const handleTitlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (text && /^#{1,6}\s+/.test(text)) {
      e.preventDefault();
      const cleaned = text.replace(/^#{1,6}\s+/, "").trim();
      onTitleChange(cleaned);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-white dark:bg-[#000000] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Header Row with status bar safe area spacing matching Image 1 */}
      <header className="flex w-full items-center justify-between px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-2 flex-shrink-0 z-20">
        {/* Left: Circular Back button (<) matching Image 1 */}
        <button
          onClick={onBack}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
          aria-label="Back to notes"
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>

        {/* Center: Live smart context-aware pill */}
        <div
          className="flex items-center gap-1.5 rounded-full bg-[#F6F3EE] dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] px-3 py-1 text-[11.5px] font-medium text-[var(--text-secondary)] shadow-2xs"
          title={contextMeta.accessibleLabel}
        >
          <Icon name={contextMeta.icon} size={13} className="text-[var(--text-primary)]" />
          <span>{contextMeta.categoryName}</span>
          {contextMeta.taskStats && (
            <span className="ml-0.5 tabular-nums text-[var(--text-muted)]">
              {contextMeta.taskStats.completed}/{contextMeta.taskStats.total}
            </span>
          )}
        </div>

        {/* Right: Pill container [Share, ...] + Done button (✓) */}
        <div className="flex items-center gap-2.5">
          {/* Pill action group with Share and More options */}
          <div className="flex items-center gap-3.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs px-3.5 py-1.5 h-11">
            {onShare && (
              <button
                onClick={onShare}
                className="text-[var(--text-primary)] hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                title="Share Note"
                aria-label="Share Note"
              >
                <Share2 size={19} strokeWidth={2.2} />
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="text-[var(--text-primary)] hover:opacity-75 active:scale-95 transition-all cursor-pointer"
              title="More Options"
              aria-label="More Options"
            >
              <MoreHorizontal size={20} strokeWidth={2.4} />
            </button>
          </div>

          {/* Monochromatic Done Button (✓) */}
          <button
            onClick={() => {
              editor.commands.blur();
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#141312] dark:bg-[var(--accent)] hover:opacity-90 text-white dark:text-[#141312] font-bold shadow-xs active:scale-90 transition-all cursor-pointer"
            aria-label="Done editing"
            title="Done"
          >
            <Check size={22} strokeWidth={2.8} />
          </button>

          {/* Overflow dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-4 top-16 z-40 w-52 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[14px]">
                {onTogglePin && (
                  <button
                    onClick={() => {
                      onTogglePin();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Pin size={17} />
                    <span>{isPinned ? "Unpin Note" : "Pin Note"}</span>
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Copy size={17} />
                    <span>Duplicate</span>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={() => {
                      onShare();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Share2 size={17} />
                    <span>Share Note</span>
                  </button>
                )}
                {onExport && (
                  <button
                    onClick={() => {
                      onExport();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Download size={17} />
                    <span>Export Markdown</span>
                  </button>
                )}
                {onCheckForUpdates && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCheckForUpdates();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Sparkles size={17} />
                    <span>Check for Updates</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="my-1.5 border-t border-black/[0.06] dark:border-white/[0.08]" />
                    <button
                      onClick={() => {
                        onDelete();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    >
                      <Trash2 size={17} />
                      <span>Delete Note</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Writing Canvas Scrollable Area */}
      <div
        style={{
          paddingBottom: isKeyboardOpen
            ? `${Math.max(keyboardHeight, 0) + 85}px`
            : "calc(6.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        className="flex-1 overflow-y-auto px-5 sm:px-6 pt-3 select-text no-scrollbar"
      >
        {/* Note Title */}
        <div className="mb-4">
          <input
            ref={titleInputRef}
            type="text"
            value={title === "Untitled" ? "" : title}
            placeholder="Title"
            onChange={(e) => onTitleChange(e.target.value)}
            onPaste={handleTitlePaste}
            disabled={isReadOnly}
            className={`w-full bg-transparent text-[30px] font-bold tracking-tight text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none border-none p-0 focus:ring-0 leading-tight ${
              prefs.fontFamily === "sans" ? "font-sans-title" : "font-serif-title"
            }`}
          />
        </div>

        {/* Tiptap Editor Content */}
        <div
          className={`text-[16px] leading-relaxed text-[var(--text-primary)] ${
            prefs.fontFamily === "sans"
              ? "font-sans"
              : prefs.fontFamily === "mono"
              ? "font-mono"
              : "font-serif"
          }`}
        >
          <EditorContent editor={editor} className="tiptap-container" />
        </div>
      </div>

      {/* Selection bubble menu - dynamically positioned below text selection to avoid native callout */}
      <EditorBubbleMenu editor={editor} />

      {/* Floating Formatting Pill Menubar matching Image 1: Docks above the virtual keyboard when open */}
      <div
        style={{
          bottom: isKeyboardOpen
            ? keyboardHeight > 0
              ? `${keyboardHeight + 8}px`
              : "max(0.6rem, env(safe-area-inset-bottom, 0px))"
            : "max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))",
        }}
        className="fixed left-4 right-4 z-40 flex justify-center pointer-events-none transition-[bottom] duration-150 ease-out"
      >
        <div
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.stopPropagation()}
          className="pointer-events-auto flex h-13 min-h-[52px] items-center justify-around gap-2 rounded-full bg-white dark:bg-[#1C1C1E] px-4 py-1.5 border border-black/[0.08] dark:border-white/[0.1] shadow-xl text-[var(--text-primary)] w-full max-w-[380px]"
        >
          {/* "Aa" Block Inserter */}
          <button
            onClick={() => setIsInsertSheetOpen(true)}
            className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-[15px] font-bold tracking-tight hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            title="Typography & Blocks"
            aria-label="Typography"
          >
            Aa
          </button>

          {/* Checklist Tasklist */}
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Checklist"
            aria-label="Checklist"
          >
            <ListTodo size={20} strokeWidth={2.3} />
          </button>

          {/* Table */}
          <button
            onClick={() =>
              (
                editor.chain().focus() as unknown as {
                  insertTable: (options: { rows: number; cols: number; withHeaderRow: boolean }) => {
                    run: () => void;
                  };
                }
              )
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("table")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Table"
            aria-label="Table"
          >
            <TableIcon size={20} strokeWidth={2.2} />
          </button>

          {/* Paperclip (Attachments / Link / Image) */}
          <button
            onClick={() => setIsInsertSheetOpen(true)}
            className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            title="Attachments"
            aria-label="Attachments"
          >
            <Paperclip size={20} strokeWidth={2.2} />
          </button>

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List size={20} strokeWidth={2.4} />
          </button>

          {/* Blockquote / Indent */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("blockquote")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Quote"
            aria-label="Quote"
          >
            <TextQuote size={20} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      {/* Block Inserter Bottom Sheet */}
      <MobileInsertSheet
        isOpen={isInsertSheetOpen}
        onClose={() => setIsInsertSheetOpen(false)}
        editor={editor}
      />
    </div>
  );
};
