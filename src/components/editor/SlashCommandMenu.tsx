import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

interface SlashCommandMenuProps {
  editor: Editor | null;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "text",
      title: "Text",
      description: "Start a normal paragraph",
      icon: "notes",
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      id: "heading1",
      title: "Heading 1",
      description: "Large section heading",
      icon: "format_h1",
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "heading2",
      title: "Heading 2",
      description: "Medium section heading",
      icon: "format_h2",
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "heading3",
      title: "Heading 3",
      description: "Small section heading",
      icon: "format_h3",
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: "checklist",
      title: "Checklist",
      description: "Track things to complete",
      icon: "check_box",
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      id: "bulletList",
      title: "Bulleted list",
      description: "Organise ideas into bullets",
      icon: "format_list_bulleted",
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: "orderedList",
      title: "Numbered list",
      description: "Create an ordered list",
      icon: "format_list_numbered",
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "quote",
      title: "Quote",
      description: "Highlight a quotation",
      icon: "format_quote",
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "codeBlock",
      title: "Code block",
      description: "Preserve code formatting",
      icon: "code",
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "divider",
      title: "Divider",
      description: "Separate sections with a rule",
      icon: "horizontal_rule",
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  // Monitor editor transactions to detect "/"
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      const currentLineText = $from.parent.textContent;

      // Check if current line contains a slash trigger
      const lastSlashIndex = currentLineText.lastIndexOf("/");
      if (lastSlashIndex !== -1 && lastSlashIndex <= $from.parentOffset) {
        const queryText = currentLineText.slice(lastSlashIndex + 1, $from.parentOffset);
        if (!queryText.includes(" ")) {
          setQuery(queryText);
          setSelectedIndex(0);

          // Calculate cursor position coordinates
          try {
            const coords = editor.view.coordsAtPos($from.pos);
            const editorRect = editor.view.dom.getBoundingClientRect();
            setPosition({
              top: coords.bottom - editorRect.top + 8,
              left: Math.max(16, coords.left - editorRect.left),
            });
            setIsOpen(true);
            return;
          } catch {}
        }
      }

      setIsOpen(false);
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

  // Execute selected command
  const executeCommand = (cmd: CommandItem) => {
    if (!editor) return;
    const { selection } = editor.state;
    const { $from } = selection;
    const currentLineText = $from.parent.textContent;
    const lastSlashIndex = currentLineText.lastIndexOf("/");

    if (lastSlashIndex !== -1) {
      const from = $from.pos - ($from.parentOffset - lastSlashIndex);
      const to = $from.pos;
      // Delete the slash and query text
      editor.chain().focus().deleteRange({ from, to }).run();
    }

    cmd.action(editor);
    setIsOpen(false);
  };

  // Keyboard navigation for menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="flex items-center justify-between px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
        <span>Insert block...</span>
        <span className="font-mono text-[9px] bg-[var(--bg-surface)] px-1 rounded">ESC</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {filtered.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                isSelected
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs flex-shrink-0">
                <Icon name={cmd.icon} size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12.5px] font-medium text-[var(--text-primary)] leading-tight">
                  {cmd.title}
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)] truncate leading-tight mt-0.5">
                  {cmd.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
