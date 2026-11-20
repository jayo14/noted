import React, { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import {
  FileText,
  List,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  Search,
  ChevronRight,
  Table as TableIcon,
} from "lucide-react";

interface InsertOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

interface MobileInsertSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export const MobileInsertSheet: React.FC<MobileInsertSheetProps> = ({
  isOpen,
  onClose,
  editor,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !editor) return null;

  const options: InsertOption[] = [
    {
      id: "heading",
      title: "Heading",
      description: "Create a section heading",
      icon: (
        <span className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
          H1
        </span>
      ),
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "text",
      title: "Text",
      description: "Start a normal paragraph",
      icon: <FileText size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      id: "bulletList",
      title: "Bulleted list",
      description: "Organise ideas into bullets",
      icon: <List size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: "checklist",
      title: "Checklist",
      description: "Track things to complete",
      icon: <CheckSquare size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      id: "quote",
      title: "Quote",
      description: "Highlight a quotation",
      icon: <Quote size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "codeBlock",
      title: "Code block",
      description: "Preserve code formatting",
      icon: <Code size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "table",
      title: "Table",
      description: "Insert a table with rows & columns",
      icon: <TableIcon size={17} className="text-[var(--text-primary)]" />,
      action: (ed) =>
        (
          ed.chain().focus() as unknown as {
            insertTable: (options: { rows: number; cols: number; withHeaderRow: boolean }) => {
              run: () => void;
            };
          }
        )
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      id: "divider",
      title: "Divider",
      description: "Separate sections",
      icon: <Minus size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "link",
      title: "Link",
      description: "Insert a web link",
      icon: <LinkIcon size={17} className="text-[var(--text-primary)]" />,
      action: (ed) => {
        const url = window.prompt("Enter URL:");
        if (url) {
          ed.chain().focus().setLink({ href: url }).run();
        }
      },
    },
  ];

  const filtered = options.filter(
    (opt) =>
      opt.title.toLowerCase().includes(query.toLowerCase()) ||
      opt.description.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet panel with safe area bottom spacing */}
      <div className="relative z-10 w-full max-h-[82vh] overflow-hidden rounded-t-[28px] bg-[var(--bg-editor)] border-t border-[var(--border-subtle)] shadow-2xl flex flex-col pb-[max(1.5rem,calc(1.25rem+env(safe-area-inset-bottom,0px)))] animate-in slide-in-from-bottom duration-250 select-none">
        {/* Top pill drag handle */}
        <div className="flex w-full justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-[var(--border-strong)] opacity-70" />
        </div>

        {/* Search header with touch height */}
        <div className="px-5 pt-1 pb-3">
          <div className="flex h-12 w-full items-center gap-2.5 rounded-2xl bg-[var(--bg-surface)] px-4 border border-transparent focus-within:border-[var(--border-strong)] transition-all">
            <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Insert anything..."
              className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border-none p-0 focus:ring-0"
            />
            <button
              onClick={onClose}
              className="flex h-8 items-center rounded-lg bg-[var(--bg-card-active)] px-3 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Options list with generous tap targets */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-[var(--border-subtle)]/40">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.action(editor);
                onClose();
              }}
              className="flex min-h-[54px] w-full items-center justify-between py-3 px-2 text-left hover:bg-[var(--bg-surface)]/60 active:bg-[var(--bg-surface)] rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] group-hover:border-[var(--border-strong)] transition-colors">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-tight">
                    {item.title}
                  </span>
                  <span className="text-[12.5px] text-[var(--text-muted)]">
                    {item.description}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={18}
                className="text-[var(--text-subtle)] group-hover:text-[var(--text-muted)] transition-colors"
              />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching block types
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
