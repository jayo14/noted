import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  Heading1,
  Heading2,
  CheckSquare,
  List,
  Quote,
} from "lucide-react";

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateMenuPosition = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !editor.isFocused) {
        setCoords(null);
        setShowLinkInput(false);
        return;
      }

      // Check if current selection has text
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      if (!selectedText.trim()) {
        setCoords(null);
        setShowLinkInput(false);
        return;
      }

      const view = editor.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      const top = Math.max(10, start.top - 48);
      const left = Math.max(10, (start.left + end.left) / 2);

      setCoords({ top, left });
    };

    editor.on("selectionUpdate", updateMenuPosition);
    editor.on("blur", () => {
      // Small timeout so clicks inside bubble menu don't instantly close it
      setTimeout(() => {
        if (!menuRef.current?.contains(document.activeElement)) {
          setCoords(null);
          setShowLinkInput(false);
        }
      }, 150);
    });

    return () => {
      editor.off("selectionUpdate", updateMenuPosition);
    };
  }, [editor]);

  if (!editor || !coords) return null;

  const handleSetLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: "translateX(-50%)",
        zIndex: 50,
      }}
      className="flex items-center gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1.5 py-1 shadow-lg backdrop-blur-md transition-opacity duration-150"
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1 px-1 py-0.5">
          <input
            type="text"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
              }
            }}
            className="w-44 bg-[var(--bg-app)] px-2 py-1 text-xs outline-none rounded border border-[var(--border-subtle)] text-[var(--text-primary)]"
            autoFocus
          />
          <button
            onClick={handleSetLink}
            className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-[var(--accent-contrast)] hover:opacity-90"
          >
            Apply
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("bold")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Bold (Cmd+B)"
          >
            <Bold size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("italic")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Italic (Cmd+I)"
          >
            <Italic size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("underline")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Underline (Cmd+U)"
          >
            <UnderlineIcon size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("strike")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("code")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Inline Code"
          >
            <Code size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("highlight")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Highlight"
          >
            <Highlighter size={14} />
          </button>

          <div className="mx-1 h-3.5 w-px bg-[var(--border-strong)]" />

          <button
            onClick={() => {
              const prevUrl = editor.getAttributes("link").href || "";
              setLinkUrl(prevUrl);
              setShowLinkInput(true);
            }}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("link")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Add Link"
          >
            <Link2 size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("taskList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Checklist"
          >
            <CheckSquare size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("bulletList")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Bullet List"
          >
            <List size={14} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("blockquote")
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title="Quote"
          >
            <Quote size={14} />
          </button>
        </>
      )}
    </div>
  );
};
