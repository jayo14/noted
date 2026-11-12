import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";

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
      className="flex items-center gap-0.5 rounded-full border border-black/10 dark:border-white/10 bg-[#161514] text-white px-2 py-1 shadow-2xl backdrop-blur-md transition-opacity duration-150 select-none animate-in fade-in zoom-in-95"
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1.5 px-1 py-0.5">
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
            className="w-44 bg-white/10 px-2.5 py-1 text-xs outline-none rounded-full border border-white/20 text-white placeholder-neutral-400"
            autoFocus
          />
          <button
            onClick={handleSetLink}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#161514] hover:opacity-90"
          >
            Apply
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("bold")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Bold (Cmd+B)"
          >
            <span className="font-bold text-xs px-0.5">B</span>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("italic")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Italic (Cmd+I)"
          >
            <span className="italic font-serif text-xs px-0.5">I</span>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("underline")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Underline (Cmd+U)"
          >
            <span className="underline text-xs px-0.5">U</span>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("strike")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Strikethrough"
          >
            <span className="line-through text-xs px-0.5">S</span>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("code")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Inline Code"
          >
            <Icon name="code" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("highlight")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Highlight"
          >
            <Icon name="ink_highlighter" size={15} />
          </button>

          <div className="mx-1 h-3.5 w-px bg-white/20" />

          <button
            onClick={() => {
              const prevUrl = editor.getAttributes("link").href || "";
              setLinkUrl(prevUrl);
              setShowLinkInput(true);
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("link")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Add Link"
          >
            <Icon name="link" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("heading", { level: 1 })
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 1"
          >
            <Icon name="format_h1" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("heading", { level: 2 })
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 2"
          >
            <Icon name="format_h2" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Checklist"
          >
            <Icon name="check_box" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Bullet List"
          >
            <Icon name="format_list_bulleted" size={15} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive("blockquote")
                ? "bg-white/25 text-white font-bold"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Quote"
          >
            <Icon name="format_quote" size={15} />
          </button>
        </>
      )}
    </div>
  );
};
