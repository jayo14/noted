import React from "react";
import { X, Command } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      group: "General & Navigation",
      items: [
        { label: "New note", shortcut: "Cmd/Ctrl + N" },
        { label: "Search notes", shortcut: "Cmd/Ctrl + F" },
        { label: "View All Notes", shortcut: "Cmd/Ctrl + 1" },
        { label: "View Pinned Notes", shortcut: "Cmd/Ctrl + 2" },
        { label: "View Trash", shortcut: "Cmd/Ctrl + 3" },
        { label: "Open Settings", shortcut: "Cmd/Ctrl + ," },
        { label: "Shortcuts Cheat Sheet", shortcut: "Cmd/Ctrl + /" },
        { label: "Dismiss dialog / blur", shortcut: "Escape" },
      ],
    },
    {
      group: "Writing & Rich Text",
      items: [
        { label: "Bold text", shortcut: "Cmd/Ctrl + B" },
        { label: "Italic text", shortcut: "Cmd/Ctrl + I" },
        { label: "Underline text", shortcut: "Cmd/Ctrl + U" },
        { label: "Strikethrough", shortcut: "Cmd/Ctrl + Shift + X" },
        { label: "Inline code", shortcut: "Cmd/Ctrl + E" },
        { label: "Heading 1 / 2 / 3", shortcut: "# / ## / ### + Space" },
        { label: "Checklist item", shortcut: "[] + Space or - [ ]" },
        { label: "Bullet list", shortcut: "- or * + Space" },
        { label: "Numbered list", shortcut: "1. + Space" },
        { label: "Quote block", shortcut: "> + Space" },
        { label: "Undo / Redo", shortcut: "Cmd/Ctrl + Z / Shift + Z" },
      ],
    },
    {
      group: "Note Organization & Export",
      items: [
        { label: "Pin / Unpin note", shortcut: "Cmd/Ctrl + P" },
        { label: "Delete note (to trash)", shortcut: "Cmd/Ctrl + Shift + D" },
        { label: "Export as Markdown", shortcut: "Cmd/Ctrl + Shift + M" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex h-[520px] w-full max-w-lg flex-col rounded-xl border border-[var(--border-strong)] bg-[var(--bg-app)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <Command size={16} className="text-[var(--text-primary)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {shortcutGroups.map((group) => (
            <div key={group.group}>
              <h3 className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-2">
                {group.group}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]/50"
                  >
                    <span className="text-[var(--text-primary)]">{item.label}</span>
                    <kbd className="rounded bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {item.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
