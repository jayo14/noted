import React from "react";
import type { Note, Collection } from "@/types";
import { extractTextFromJSONContent, formatCompactRelativeTime } from "@/lib/utils";
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
  searchSnippet,
  onClick,
}) => {
  const relativeTime = formatCompactRelativeTime(note.updated_at);
  const previewItems = extractStructuredPreview(note);

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col rounded-xl px-3.5 py-2.5 transition-all select-none mx-2 mb-1 ${
        isSelected
          ? "bg-[#eae5d9] dark:bg-[#2b2824] shadow-2xs"
          : "bg-transparent hover:bg-[var(--bg-surface-hover)]"
      }`}
    >
      {/* Title & Time row */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight">
          {note.title || "Untitled"}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-normal text-[var(--text-muted)]">
            {relativeTime}
          </span>
          {note.is_pinned && (
            <Icon name="push_pin" size={12} className="text-[var(--text-primary)] opacity-80" />
          )}
        </div>
      </div>

      {/* Preview text or task items */}
      <div className="mt-1 flex flex-col gap-0.5">
        {searchSnippet ? (
          <p className="line-clamp-2 text-[12px] leading-snug text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-primary)]">{searchSnippet}</span>
          </p>
        ) : previewItems.length > 0 ? (
          previewItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-[12px] leading-snug text-[var(--text-muted)] truncate"
            >
              {item.type === "task" ? (
                <>
                  <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
                    {item.checked ? "✔" : "○"}
                  </span>
                  <span className={`truncate ${item.checked ? "line-through opacity-70" : ""}`}>
                    {item.text}
                  </span>
                </>
              ) : (
                <span className="truncate">{item.text}</span>
              )}
            </div>
          ))
        ) : (
          <p className="text-[12px] text-[var(--text-subtle)] italic leading-snug">
            No additional text
          </p>
        )}
      </div>
    </div>
  );
};
