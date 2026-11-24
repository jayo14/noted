import React, { useMemo } from "react";
import type { Note, Collection } from "@/types";
import { extractTextFromJSONContent, formatCompactRelativeTime } from "@/lib/utils";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import { Icon } from "@/components/ui/Icon";
import type { NoteListDensity } from "@/services/settingsService";

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  collections: Collection[];
  searchSnippet?: string;
  viewMode?: "list" | "grid";
  noteListDensity?: NoteListDensity;
  showChecklistPreview?: boolean;
  onClick: () => void;
}

interface PreviewItem {
  type: "text" | "task";
  text: string;
  checked?: boolean;
}

function extractStructuredPreview(note: Note): PreviewItem[] {
  const content = note.content;
  if (!content || !content.content) {
    return [];
  }

  const items: PreviewItem[] = [];

  for (const node of content.content) {
    if (items.length >= 2) break;

    if (node.type === "taskList" && node.content) {
      for (const item of node.content) {
        if (items.length >= 2) break;
        const text = extractTextFromJSONContent(item).trim();
        const checked = item.attrs?.checked === true;
        if (text) {
          items.push({ type: "task", text, checked });
        }
      }
    } else if (node.type === "paragraph" || node.type === "heading" || node.type === "blockquote") {
      const text = extractTextFromJSONContent(node).trim();
      if (text && text !== note.title) {
        items.push({ type: "text", text });
      }
    }
  }

  return items;
}

export const NoteCard: React.FC<NoteCardProps> = React.memo(({
  note,
  isSelected,
  collections,
  searchSnippet,
  viewMode = "list",
  noteListDensity = "comfortable",
  showChecklistPreview = true,
  onClick,
}) => {
  const collection = useMemo(
    () => collections.find((c) => c.id === note.collection_id),
    [collections, note.collection_id],
  );

  const iconMeta = useMemo(
    () => classifyNoteIcon(note, collection?.name),
    [note, collection?.name],
  );

  const relativeTime = formatCompactRelativeTime(note.updated_at);
  const previewItems = useMemo(() => extractStructuredPreview(note), [note]);

  if (viewMode === "grid") {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`${note.title || "Untitled"}, ${iconMeta.accessibleLabel}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={`group relative flex flex-col justify-between cursor-pointer rounded-xl transition-all select-none p-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[134px] border ${
          isSelected
            ? "bg-[var(--bg-card-active)] border-[var(--border-strong)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-[var(--accent)]/20"
            : "bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-2xs"
        }`}
      >
        <div>
          {/* Top row: Category icon, task stats, and Pin */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                  isSelected
                    ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                    : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                }`}
                title={iconMeta.categoryName}
              >
                <Icon name={iconMeta.icon} size={14} />
              </div>
              {iconMeta.taskStats && (
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-medium tabular-nums text-[var(--text-muted)]">
                  {iconMeta.taskStats.completed}/{iconMeta.taskStats.total}
                </span>
              )}
            </div>
            {note.is_pinned && (
              <Icon
                name="keep"
                size={13}
                filled
                className={`rotate-45 ${
                  isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}
              />
            )}
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-xs font-semibold text-[var(--text-primary)] leading-snug mt-2">
            {note.title || "Untitled"}
          </h3>

          {/* Preview snippet or tasks */}
          <div className="mt-1.5 flex flex-col gap-0.5">
            {searchSnippet ? (
              <p className="line-clamp-2 text-[10.5px] leading-relaxed text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-primary)]">{searchSnippet}</span>
              </p>
            ) : previewItems.length > 0 ? (
              previewItems.slice(0, 2).map((item, idx) => (
                <p
                  key={idx}
                  className={`line-clamp-1 text-[10.5px] leading-tight ${
                    isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.type === "task"
                    ? `${showChecklistPreview ? (item.checked ? "✓ " : "○ ") : ""}${item.text}`
                    : item.text}
                </p>
              ))
            ) : (
              <p className="text-[10.5px] text-[var(--text-subtle)] italic leading-tight">
                No additional text
              </p>
            )}
          </div>
        </div>

        {/* Bottom meta row: Collection tag and Relative timestamp */}
        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)]/60 pt-1.5 text-[9.5px]">
          <span className="truncate max-w-[85px] text-[var(--text-muted)] font-medium">
            {collection?.name || iconMeta.categoryName}
          </span>
          <span
            className={`${
              isSelected ? "text-[var(--text-secondary)] font-medium" : "text-[var(--text-muted)]"
            }`}
          >
            {relativeTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${note.title || "Untitled"}, ${iconMeta.accessibleLabel}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex cursor-pointer gap-2.5 rounded-xl transition-all select-none mb-1 mx-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        noteListDensity === "compact" ? "p-2" : "p-3"
      } ${
        isSelected
          ? "bg-[var(--bg-card-active)] border border-[var(--border-strong)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          : "bg-transparent hover:bg-[var(--bg-surface-hover)] border border-transparent"
      }`}
    >
      {/* Intelligent Category Icon */}
      <div
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors ${
          isSelected
            ? "bg-black/[0.06] dark:bg-white/[0.08] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        }`}
        title={iconMeta.categoryName}
      >
        <Icon name={iconMeta.icon} size={16} />
      </div>

      {/* Main card body */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Title & Time row */}
        <div className="flex items-baseline justify-between gap-1.5">
          <h3 className="truncate text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
            {note.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {iconMeta.taskStats && (
              <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-medium tabular-nums text-[var(--text-muted)]">
                {iconMeta.taskStats.completed}/{iconMeta.taskStats.total}
              </span>
            )}
            <span
              className={`text-[10.5px] leading-none ${
                isSelected ? "text-[var(--text-secondary)] font-medium" : "text-[var(--text-muted)]"
              }`}
            >
              {relativeTime}
            </span>
            {note.is_pinned && (
              <Icon
                name="keep"
                size={12}
                filled
                className={`rotate-45 ${
                  isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}
              />
            )}
          </div>
        </div>

        {/* Preview text or task items */}
        <div className="mt-1 flex flex-col gap-0.5">
          {searchSnippet ? (
            <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-primary)]">{searchSnippet}</span>
            </p>
          ) : previewItems.length > 0 ? (
            previewItems.map((item, idx) => (
              <p
                key={idx}
                className={`truncate text-[11.5px] leading-snug ${
                  isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {item.type === "task"
                  ? `${showChecklistPreview ? (item.checked ? "✓ " : "○ ") : ""}${item.text}`
                  : item.text}
              </p>
            ))
          ) : (
            <p className="text-[11.5px] text-[var(--text-subtle)] italic leading-snug">
              No additional text
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

NoteCard.displayName = "NoteCard";
