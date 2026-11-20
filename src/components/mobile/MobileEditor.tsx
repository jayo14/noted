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
} from "lucide-react";
import { MobileInsertSheet } from "./MobileInsertSheet";
import { EditorBubbleMenu } from "@/components/editor/EditorBubbleMenu";
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

      // On Android with interactive-widget=resizes-content, innerHeight shrinks with keyboard
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
    <div className="relative flex h-full w-full flex-col bg-[var(--bg-editor)] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Header Row with status bar safe area spacing */}
      <header className="flex h-[calc(3.75rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px))] w-full items-center justify-between border-b border-[var(--border-subtle)]/40 bg-[var(--bg-editor)] px-3 sm:px-4 flex-shrink-0 z-20">
        {/* Left: Back button with comfortable 44px+ touch target */}
        <button
          onClick={onBack}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-90 transition-all cursor-pointer"
          aria-label="Back to notes"
        >
          <ArrowLeft size={23} strokeWidth={2.2} />
        </button>

        {/* Center: Undo & Redo buttons with large touch targets */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-[var(--text-primary)]">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-primary)] disabled:text-[var(--text-subtle)]/40 hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface-active)] rounded-full transition-colors cursor-pointer"
            aria-label="Undo"
          >
            <Undo2 size={21} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-primary)] disabled:text-[var(--text-subtle)]/40 hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface-active)] rounded-full transition-colors cursor-pointer"
            aria-label="Redo"
          >
            <Redo2 size={21} strokeWidth={2.2} />
          </button>
        </div>

        {/* Right: More Menu with touch target */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-90 transition-all cursor-pointer"
            aria-label="Note options"
          >
            <MoreVertical size={22} strokeWidth={2.2} />
          </button>

          {/* More menu dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-40 w-52 rounded-2xl bg-[var(--bg-editor)] border border-[var(--border-subtle)] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[14px]">
                {onTogglePin && (
                  <button
                    onClick={() => {
                      onTogglePin();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
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
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
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
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
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
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-[var(--bg-surface)] cursor-pointer"
                  >
                    <Download size={17} />
                    <span>Export Markdown</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="my-1.5 border-t border-[var(--border-subtle)]" />
                    <button
                      onClick={() => {
                        onDelete();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
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
            ? `${Math.max(keyboardHeight, 0) + 90}px`
            : "calc(7rem + env(safe-area-inset-bottom, 0px))",
        }}
        className="flex-1 overflow-y-auto px-5 sm:px-6 pt-5 select-text no-scrollbar"
      >
        {/* Note Title */}
        <div className="mb-4">
          <input
            ref={titleInputRef}
            type="text"
            value={title === "Untitled" ? "" : title}
            placeholder="Ideas for Kova"
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

      {/* Formatting Menubar at bottom: Docks above the virtual keyboard when open, or above safe area */}
      <div
        style={{
          bottom: isKeyboardOpen
            ? keyboardHeight > 0
              ? `${keyboardHeight + 8}px`
              : "max(0.6rem, env(safe-area-inset-bottom, 0px))"
            : "max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))",
        }}
        className="fixed left-3 right-3 sm:left-4 sm:right-4 z-40 flex justify-center pointer-events-none transition-[bottom] duration-150 ease-out"
      >
        <div
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.stopPropagation()}
          className="pointer-events-auto flex h-14 min-h-[56px] items-center justify-between gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md px-2.5 sm:px-4 py-1.5 border border-[var(--border-subtle)] shadow-xl text-[var(--text-primary)] max-w-full overflow-x-auto no-scrollbar"
        >
          {/* "Aa" button opens Block Inserter */}
          <button
            onClick={() => setIsInsertSheetOpen(true)}
            className="flex h-11 min-h-[44px] min-w-[44px] px-3.5 items-center justify-center rounded-xl sm:rounded-full text-[15px] font-bold tracking-tight hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all cursor-pointer"
            title="Insert block"
          >
            Aa
          </button>

          <div className="h-6 w-px bg-[var(--border-strong)] mx-0.5 opacity-60 flex-shrink-0" />

          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("bold")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Bold"
          >
            <Bold size={21} strokeWidth={2.4} />
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("italic")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Italic"
          >
            <Italic size={21} strokeWidth={2.4} />
          </button>

          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("underline")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Underline"
          >
            <UnderlineIcon size={21} strokeWidth={2.4} />
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("strike")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={21} strokeWidth={2.4} />
          </button>

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Bullet list"
          >
            <List size={22} strokeWidth={2.4} />
          </button>

          {/* Checklist */}
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] active:bg-[var(--bg-surface-active)]"
            }`}
            title="Checklist"
          >
            <CheckSquare size={21} strokeWidth={2.3} />
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
