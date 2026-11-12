import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Note } from "@/types";
import { jsonContentToMarkdown } from "@/lib/export";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onExportMarkdown?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  note,
  onExportMarkdown,
}) => {
  const [copiedState, setCopiedState] = useState<string | null>(null);

  if (!isOpen || !note) return null;

  const handleCopyMarkdown = async () => {
    try {
      const md = (note.title ? `# ${note.title}\n\n` : "") + jsonContentToMarkdown(note.content);
      await navigator.clipboard.writeText(md);
      setCopiedState("markdown");
      setTimeout(() => setCopiedState(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleCopyPlainText = async () => {
    try {
      const md = (note.title ? `${note.title}\n\n` : "") + jsonContentToMarkdown(note.content);
      const plain = md.replace(/[#*`_~\[\]]/g, "");
      await navigator.clipboard.writeText(plain);
      setCopiedState("text");
      setTimeout(() => setCopiedState(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-5 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#141312] dark:bg-[#f7f5f0] text-white dark:text-[#141312]">
              <Icon name="share" size={14} />
            </div>
            <h2 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
              Share Note
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* Note Target Preview */}
        <div className="my-3 rounded-xl bg-[var(--bg-surface)] p-3">
          <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
            {note.title || "Untitled Note"}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Local-first note • Ready to export or copy
          </div>
        </div>

        {/* Share Options */}
        <div className="flex flex-col gap-1.5 py-1">
          {/* Copy Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex w-full items-center justify-between rounded-xl p-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="content_copy" size={16} className="text-[var(--text-muted)]" />
              <div className="text-left">
                <div className="font-medium text-[12.5px]">Copy as Markdown</div>
                <div className="text-[10.5px] text-[var(--text-muted)]">Includes headers, formatting & tasks</div>
              </div>
            </div>
            {copiedState === "markdown" ? (
              <span className="text-[11px] font-semibold text-emerald-600">Copied!</span>
            ) : (
              <Icon name="chevron_right" size={15} className="text-[var(--text-subtle)]" />
            )}
          </button>

          {/* Copy Plain Text */}
          <button
            onClick={handleCopyPlainText}
            className="flex w-full items-center justify-between rounded-xl p-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="text_snippet" size={16} className="text-[var(--text-muted)]" />
              <div className="text-left">
                <div className="font-medium text-[12.5px]">Copy Plain Text</div>
                <div className="text-[10.5px] text-[var(--text-muted)]">Clean text without markdown symbols</div>
              </div>
            </div>
            {copiedState === "text" ? (
              <span className="text-[11px] font-semibold text-emerald-600">Copied!</span>
            ) : (
              <Icon name="chevron_right" size={15} className="text-[var(--text-subtle)]" />
            )}
          </button>

          {/* Export File */}
          {onExportMarkdown && (
            <button
              onClick={() => {
                onExportMarkdown();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Icon name="download" size={16} className="text-[var(--text-muted)]" />
                <div className="text-left">
                  <div className="font-medium text-[12.5px]">Download .md File</div>
                  <div className="text-[10.5px] text-[var(--text-muted)]">Save directly to your computer</div>
                </div>
              </div>
              <Icon name="chevron_right" size={15} className="text-[var(--text-subtle)]" />
            </button>
          )}

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="flex w-full items-center justify-between rounded-xl p-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="print" size={16} className="text-[var(--text-muted)]" />
              <div className="text-left">
                <div className="font-medium text-[12.5px]">Print or Save PDF</div>
                <div className="text-[10.5px] text-[var(--text-muted)]">Use browser system print dialog</div>
              </div>
            </div>
            <Icon name="chevron_right" size={15} className="text-[var(--text-subtle)]" />
          </button>
        </div>

        <div className="mt-4 pt-2 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
