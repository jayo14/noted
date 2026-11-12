import React from "react";
import type { Note, Collection } from "@/types";
import { extractTextFromJSONContent, formatCompactRelativeTime } from "@/lib/utils";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import { Icon } from "@/components/ui/Icon";

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  collections: Collection[];
  searchSnippet?: string;
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

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  collections,
  searchSnippet,
  onClick,
}) => {
  const collection = collections.find((c) => c.id === note.collection_id);
  const iconMeta = classifyNoteIcon(note, collection?.name);
  const relativeTime = formatCompactRelativeTime(note.updated_at);
  const previewItems = extractStructuredPreview(note);

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
      className={`group relative flex cursor-pointer gap-2.5 rounded-xl p-3 transition-all select-none mb-1 mx-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        isSelected
          ? "bg-[var(--bg-card-active)] border border-[var(--border-strong)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          : "bg-transparent hover:bg-[var(--bg-surface-hover)] border border-transparent"
      }`}
    >
      {/* Intelligent Category Icon on left matching Image 1 */}
      <div
        className={`pt-0.5 flex-shrink-0 transition-colors ${
          isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        }`}
        title={iconMeta.categoryName}
      >
        <Icon name={iconMeta.icon} size={18} />
      </div>

      {/* Main card body */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Title & Time row */}
        <div className="flex items-baseline justify-between gap-1.5">
          <h3 className="truncate text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
            {note.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
                size={13}
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
                  ? `${item.checked ? "✔ " : "- "}${item.text}`
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
};
