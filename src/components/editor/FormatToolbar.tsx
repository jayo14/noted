import React, { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface FormatToolbarProps {
  editor: Editor | null;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onBack?: () => void;
  isMobile?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  editor,
  isPinned = false,
  onTogglePin,
  onDuplicate,
  onDelete,
  onExport,
  onShare,
  onBack,
  isMobile = false,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const getCurrentStyleLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Normal";
  };

  const setStyle = (style: "paragraph" | 1 | 2 | 3) => {
    if (style === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: style }).run();
    }
    setIsStyleMenuOpen(false);
  };

  const handleLinkSet = () => {
    if (linkHref.trim()) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkHref.trim() }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setIsLinkPromptOpen(false);
    setLinkHref("");
  };

  return (
    <div className="flex h-11 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-editor)] px-4 select-none">
      {/* Left Formatting Tools matching Image 1 */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {isMobile && onBack && (
          <button
            onClick={onBack}
            className="mr-2 flex items-center gap-1 rounded-md p-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            title="Back to notes"
          >
            <Icon name="arrow_back" size={16} />
          </button>
        )}

        {/* Style Dropdown: Normal ⌵ */}
        <div className="relative" ref={styleMenuRef}>
          <button
            onClick={() => setIsStyleMenuOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <span className="text-[12.5px]">{getCurrentStyleLabel()}</span>
            <Icon name="expand_more" size={15} className="text-[var(--text-muted)]" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute left-0 top-8 z-40 w-36 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1 shadow-lg text-[var(--text-primary)]">
              <button
                onClick={() => setStyle("paragraph")}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs ${
                  editor.isActive("paragraph") ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setStyle(1)}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-sm font-bold font-serif-title ${
                  editor.isActive("heading", { level: 1 }) ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                Heading 1
              </button>
              <button
                onClick={() => setStyle(2)}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  editor.isActive("heading", { level: 2 }) ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                Heading 2
              </button>
              <button
                onClick={() => setStyle(3)}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  editor.isActive("heading", { level: 3 }) ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                Heading 3
              </button>
            </div>
          )}
        </div>

        <div className="mx-1.5 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Text marks: B I U S */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md font-bold text-xs transition-colors cursor-pointer ${
            editor.isActive("bold") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
          title="Bold (Cmd+B)"
        >
          <span className="font-bold">B</span>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-xs italic transition-colors cursor-pointer ${
            editor.isActive("italic") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
          title="Italic (Cmd+I)"
        >
          <span className="italic font-serif">I</span>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-xs underline transition-colors cursor-pointer ${
            editor.isActive("underline") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
          title="Underline (Cmd+U)"
        >
          <span className="underline">U</span>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-xs line-through transition-colors cursor-pointer ${
            editor.isActive("strike") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          }`}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </button>

        <div className="mx-1.5 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Lists: bullet, number, checklist matching Image 0 */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("bulletList") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Bullet List"
        >
          <Icon name="format_list_bulleted" size={17} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("orderedList") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Numbered List"
        >
          <Icon name="format_list_numbered" size={17} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("taskList") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Checklist"
        >
          <Icon name="check_box" size={16} />
        </button>

        <div className="mx-1.5 h-3.5 w-px bg-[var(--border-subtle)]" />

        {/* Inlines & Blocks: link, code, quote, image, more matching Image 0 */}
        <button
          onClick={() => setIsLinkPromptOpen((prev) => !prev)}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("link") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Add Link"
        >
          <Icon name="link" size={17} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("code") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Inline Code"
        >
          <Icon name="code" size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
            editor.isActive("blockquote") ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          }`}
          title="Quote / Callout Block"
        >
          <Icon name="format_quote" size={17} />
        </button>

        <button
          onClick={() => {
            const url = prompt("Enter image URL:");
            if (url) {
              (editor.chain().focus() as unknown as { setImage: (options: { src: string }) => { run: () => void } }).setImage({ src: url }).run();
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Insert image"
        >
          <Icon name="image" size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Horizontal Divider"
        >
          <Icon name="more_horiz" size={16} />
        </button>
      </div>

      {/* Link Input Popover */}
      {isLinkPromptOpen && (
        <div className="absolute left-64 top-10 z-40 flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-editor)] p-1.5 shadow-xl">
          <input
            type="url"
            autoFocus
            placeholder="https://..."
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLinkSet();
              if (e.key === "Escape") setIsLinkPromptOpen(false);
            }}
            className="w-48 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none"
          />
          <button
            onClick={handleLinkSet}
            className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-contrast)]"
          >
            Set
          </button>
        </div>
      )}

      {/* Right Controls matching Image 1: Pin, Share pill, More dots */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
              isPinned
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            }`}
            title={isPinned ? "Unpin note" : "Pin note"}
          >
            <Icon name="keep" size={17} className={isPinned ? "rotate-45" : ""} />
          </button>
        )}

        {/* Share Button Pill matching Image 1 */}
        <button
          onClick={onShare || onExport}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-3.5 py-1 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          title="Share note"
        >
          <span className="text-[12px]">Share</span>
        </button>

        {/* Overflow Menu (Three vertical dots) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="More options"
          >
            <Icon name="more_vert" size={17} />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 top-8 z-40 w-44 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1 shadow-xl">
              {onDuplicate && (
                <button
                  onClick={() => {
                    onDuplicate();
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Icon name="content_copy" size={15} />
                  <span>Duplicate Note</span>
                </button>
              )}

              {onExport && (
                <button
                  onClick={() => {
                    onExport();
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Icon name="download" size={15} />
                  <span>Export Markdown</span>
                </button>
              )}

              {onToggleZenMode && !isMobile && (
                <button
                  onClick={() => {
                    onToggleZenMode();
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Icon name={isZenMode ? "fullscreen_exit" : "fullscreen"} size={15} />
                  <span>{isZenMode ? "Exit Focus Mode" : "Focus Mode"}</span>
                </button>
              )}

              {onDelete && (
                <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                  <button
                    onClick={() => {
                      onDelete();
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
                  >
                    <Icon name="delete" size={15} />
                    <span>Delete Note</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Windows Caption Controls matching Image top right */}
        {!isMobile && (
          <div className="flex items-center gap-0.5 ml-3 pl-3 border-l border-[var(--border-subtle)]">
            <button
              onClick={async () => {
                try {
                  const appWindow = getCurrentWindow();
                  await appWindow.minimize();
                } catch {}
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Minimize"
            >
              <span className="text-[12px] font-normal leading-none">─</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const appWindow = getCurrentWindow();
                  await appWindow.toggleMaximize();
                } catch {}
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Maximize"
            >
              <span className="text-[10px] font-normal leading-none">▢</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const appWindow = getCurrentWindow();
                  await appWindow.close();
                } catch {}
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <span className="text-[11px] font-normal leading-none">✕</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
