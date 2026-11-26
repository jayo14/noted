import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import {
  ChevronLeft,
  Check,
  Share2,
  Table as TableIcon,
  Paperclip,
  List,
  ListTodo,
  TextQuote,
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
  onShare,
  collections = [],
  collectionId = null,
  isReadOnly = false,
}) => {
  const [isInsertSheetOpen, setIsInsertSheetOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
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

        {/* Right: Share button + Done button (✓) */}
        <div className="flex items-center gap-2.5">
          {onShare && (
            <button
              onClick={onShare}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
              title="Share Note"
              aria-label="Share Note"
            >
              <Share2 size={19} strokeWidth={2.2} />
            </button>
          )}

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
              prefs.fontFamily === "sans"
                ? "font-sans-title"
                : prefs.fontFamily === "mono"
                ? "font-mono-title"
                : "font-serif-title"
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

      {/* Floating Slidable Formatting Pill Menubar: Docks above keyboard when open or at bottom */}
      <div
        style={{
          bottom: isKeyboardOpen
            ? keyboardHeight > 0
              ? `${keyboardHeight + 8}px`
              : "max(0.6rem, env(safe-area-inset-bottom, 0px))"
            : "max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))",
        }}
        className="fixed left-3 right-3 z-40 flex flex-col items-center gap-2 pointer-events-none transition-[bottom] duration-150 ease-out"
      >
        {showLinkInput && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.stopPropagation()}
            className="pointer-events-auto flex w-full max-w-[380px] items-center gap-2 rounded-full bg-white dark:bg-[#1C1C1E] px-3 py-1.5 border border-black/[0.08] dark:border-white/[0.1] shadow-xl"
          >
            <input
              type="url"
              placeholder="Paste or type URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = linkUrl.trim();
                  if (!trimmed) {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  } else {
                    const href = /^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:") ? trimmed : `https://${trimmed}`;
                    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
                  }
                  setShowLinkInput(false);
                  setLinkUrl("");
                } else if (e.key === "Escape") {
                  setShowLinkInput(false);
                }
              }}
              autoFocus
              className="flex-1 bg-transparent px-2 text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border-none"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = linkUrl.trim();
                if (!trimmed) {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                } else {
                  const href = /^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:") ? trimmed : `https://${trimmed}`;
                  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
                }
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className="rounded-full bg-[#141312] dark:bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white dark:text-[#141312] cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}

        <div
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.stopPropagation()}
          className="pointer-events-auto flex h-13 min-h-[52px] w-full max-w-[420px] flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar rounded-full bg-white dark:bg-[#1C1C1E] px-3 py-1.5 border border-black/[0.08] dark:border-white/[0.1] shadow-xl text-[var(--text-primary)]"
        >
          {/* "Aa" Block Inserter */}
          <button
            onClick={() => setIsInsertSheetOpen(true)}
            className="flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold tracking-tight hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            title="Typography & Blocks"
            aria-label="Typography"
          >
            Aa
          </button>

          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("bold")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Bold"
            aria-label="Bold"
          >
            <span className="font-bold text-[15px]">B</span>
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("italic")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Italic"
            aria-label="Italic"
          >
            <span className="italic font-serif text-[15px]">I</span>
          </button>

          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("underline")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Underline"
            aria-label="Underline"
          >
            <span className="underline text-[15px] font-medium">U</span>
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("strike")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <span className="line-through text-[15px] font-medium">S</span>
          </button>

          {/* Highlight */}
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("highlight")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Highlight"
            aria-label="Highlight"
          >
            <Icon name="ink_highlighter" size={19} />
          </button>

          {/* Inline Code */}
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("code")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Inline Code"
            aria-label="Inline Code"
          >
            <Icon name="code" size={19} />
          </button>

          {/* Link */}
          <button
            onClick={() => {
              const prevUrl = editor.getAttributes("link").href || "";
              setLinkUrl(prevUrl);
              setShowLinkInput((prev) => !prev);
            }}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("link") || showLinkInput
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Link"
            aria-label="Link"
          >
            <Icon name="link" size={19} />
          </button>

          {/* Heading 1 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("heading", { level: 1 })
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Icon name="format_h1" size={19} />
          </button>

          {/* Heading 2 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("heading", { level: 2 })
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Icon name="format_h2" size={19} />
          </button>

          {/* Checklist Tasklist */}
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Checklist"
            aria-label="Checklist"
          >
            <ListTodo size={20} strokeWidth={2.3} />
          </button>

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List size={20} strokeWidth={2.4} />
          </button>

          {/* Blockquote / Quote */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
              editor.isActive("blockquote")
                ? "bg-[#141312] dark:bg-white text-white dark:text-[#141312] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            }`}
            title="Quote"
            aria-label="Quote"
          >
            <TextQuote size={20} strokeWidth={2.3} />
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
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
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
            className="flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            title="Attachments"
            aria-label="Attachments"
          >
            <Paperclip size={20} strokeWidth={2.2} />
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
