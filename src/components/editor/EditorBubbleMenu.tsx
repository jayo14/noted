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

      // Detect if device is touch or mobile/tablet
      const isTouch =
        typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          "ontouchstart" in window ||
          window.innerWidth < 1024);

      const vv = window.visualViewport;
      const viewportWidth = vv?.width || window.innerWidth;
      const vvTop = vv?.offsetTop || 0;
      const vvHeight = vv?.height || window.innerHeight;
      const maxVisibleBottom = vvTop + vvHeight;

      const menuWidth = menuRef.current?.offsetWidth || 280;
      const menuHeight = menuRef.current?.offsetHeight || 44;

      let top: number;

      if (isTouch) {
        // On mobile/tablet, the phone's native selection toolbar (Select All, Cut, Copy, Paste, etc.)
        // floats directly ABOVE the selection (approx 45-60px above start.top).
        // Therefore, our primary position is comfortably BELOW the selection.
        const selectionBottom = Math.max(start.bottom, end.bottom);
        const desiredTop = selectionBottom + 14;

        // Leave clearance for the bottom toolbar & virtual keyboard (approx 72px)
        const clearanceBottom = maxVisibleBottom - 72;

        if (desiredTop + menuHeight <= clearanceBottom) {
          // Room below selection: place below to completely avoid phone's native selection bar
          top = desiredTop;
        } else {
          // Not enough room below: place ABOVE the phone's native selection bar (offset -90px)
          const selectionTop = Math.min(start.top, end.top);
          const safeTop = selectionTop - 90;

          if (safeTop >= 50) {
            top = safeTop;
          } else {
            // If near very top and very bottom, dock safely above the bottom toolbar
            top = Math.max(16, clearanceBottom - menuHeight - 8);
          }
        }
      } else {
        // On desktop with mouse/trackpad pointer: position above selection
        top = Math.max(12, start.top - 48);
      }

      // Clamp horizontally so bubble menu stays fully visible within viewport boundaries
      const halfWidth = menuWidth / 2;
      const rawLeft = (start.left + end.left) / 2;
      const left = Math.max(halfWidth + 12, Math.min(viewportWidth - halfWidth - 12, rawLeft));

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
      }, 200);
    });

    // Also update on scroll / visual viewport resize
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateMenuPosition);
    vv?.addEventListener("scroll", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      editor.off("selectionUpdate", updateMenuPosition);
      vv?.removeEventListener("resize", updateMenuPosition);
      vv?.removeEventListener("scroll", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [editor]);

  if (!editor || !coords) return null;

  const handleSetLink = () => {
    const trimmed = linkUrl.trim();
    if (
      trimmed &&
      !trimmed.toLowerCase().startsWith("javascript:") &&
      !trimmed.toLowerCase().startsWith("vbscript:")
    ) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
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
      className="flex max-w-[94vw] items-center gap-1 rounded-2xl sm:rounded-full border border-black/10 dark:border-white/10 bg-[#161514]/95 text-white p-1.5 shadow-2xl backdrop-blur-md select-none animate-in fade-in zoom-in-95 overflow-x-auto no-scrollbar"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
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
            className="w-48 bg-white/10 px-3 py-1.5 text-xs outline-none rounded-full border border-white/20 text-white placeholder-neutral-400"
            autoFocus
          />
          <button
            onClick={handleSetLink}
            className="h-8 min-w-[54px] rounded-full bg-white px-3 text-xs font-semibold text-[#161514] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Apply
          </button>
        </div>
      ) : (
        <>
          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("bold")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Bold (Cmd+B)"
          >
            <span className="font-bold text-sm">B</span>
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("italic")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Italic (Cmd+I)"
          >
            <span className="italic font-serif text-sm">I</span>
          </button>

          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("underline")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Underline (Cmd+U)"
          >
            <span className="underline text-sm font-medium">U</span>
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("strike")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Strikethrough"
          >
            <span className="line-through text-sm font-medium">S</span>
          </button>

          {/* Highlight */}
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("highlight")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Highlight"
          >
            <Icon name="ink_highlighter" size={18} />
          </button>

          {/* Code */}
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("code")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Inline Code"
          >
            <Icon name="code" size={18} />
          </button>

          <div className="mx-1 h-5 w-px bg-white/20 flex-shrink-0" />

          {/* Link */}
          <button
            onClick={() => {
              const prevUrl = editor.getAttributes("link").href || "";
              setLinkUrl(prevUrl);
              setShowLinkInput(true);
            }}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("link")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Add Link"
          >
            <Icon name="link" size={18} />
          </button>

          {/* Heading 1 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("heading", { level: 1 })
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Heading 1"
          >
            <Icon name="format_h1" size={18} />
          </button>

          {/* Heading 2 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("heading", { level: 2 })
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Heading 2"
          >
            <Icon name="format_h2" size={18} />
          </button>

          {/* Checklist */}
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("taskList")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Checklist"
          >
            <Icon name="check_box" size={18} />
          </button>

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Bullet List"
          >
            <Icon name="format_list_bulleted" size={18} />
          </button>

          {/* Quote */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              editor.isActive("blockquote")
                ? "bg-white/30 text-white font-bold shadow-xs"
                : "text-neutral-300 hover:bg-white/15 hover:text-white"
            }`}
            title="Quote"
          >
            <Icon name="format_quote" size={18} />
          </button>
        </>
      )}
    </div>
  );
};
