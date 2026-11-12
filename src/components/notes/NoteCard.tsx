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

function getNoteCardIcon(note: Note, collectionName?: string): string {
  const titleLower = (note.title || "").toLowerCase();
  const colLower = (collectionName || "").toLowerCase();
  const raw = JSON.stringify(note.content);

  if (titleLower.includes("grocery") || titleLower.includes("shop") || titleLower.includes("market")) {
    return "shopping_cart";
  }
  if (titleLower.includes("poem") || titleLower.includes("quote") || raw.includes('"type":"blockquote"')) {
    return "format_quote";
  }
  if (titleLower.includes("idea") || colLower.includes("idea") || titleLower.includes("platform")) {
    return "lightbulb";
  }
  if (titleLower.includes("study") || titleLower.includes("learn") || titleLower.includes("machine learning")) {
    return "school";
  }
  if (titleLower.includes("later") || colLower.includes("later") || titleLower.includes("wishlist")) {
    return "bookmark";
  }
  if (raw.includes('"type":"taskList"') || raw.includes('"type":"taskItem"') || titleLower.includes("plan") || titleLower.includes("roadmap")) {
    return "list_alt";
  }
  return "description";
}

function extractStructuredPreview(note: Note): { lines: string[] } {
  const content = note.content;
  if (!content || !content.content) {
    return { lines: [] };
  }

  const lines: string[] = [];

  for (const node of content.content) {
    if (lines.length >= 2) break;

    if (node.type === "taskList" && node.content) {
      for (const item of node.content) {
        if (lines.length >= 2) break;
        const text = extractTextFromJSONContent(item).trim();
        if (text) {
          lines.push(`- ${text}`);
        }
      }
    } else if (node.type === "paragraph" || node.type === "heading" || node.type === "blockquote") {
      const text = extractTextFromJSONContent(node).trim();
      if (text && text !== note.title) {
        lines.push(text);
      }
    }
  }

  return { lines };
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  collections,
  searchSnippet,
  onClick,
}) => {
  const collection = collections.find((c) => c.id === note.collection_id);
  const iconName = getNoteCardIcon(note, collection?.name);
  const relativeTime = formatCompactRelativeTime(note.updated_at);
  const { lines } = extractStructuredPreview(note);

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer gap-2.5 rounded-xl p-3 transition-all select-none mb-1 mx-2 ${
        isSelected
          ? "bg-white dark:bg-[#232321] border border-[var(--border-subtle)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          : "bg-transparent hover:bg-[var(--bg-surface-hover)] border border-transparent"
      }`}
    >
      {/* Category icon on left */}
      <div className="pt-0.5 flex-shrink-0 text-[var(--text-muted)]">
        <Icon name={iconName} size={18} />
      </div>

      {/* Main card body */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Title & Time row */}
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="truncate text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
            {note.title || "Untitled"}
          </h3>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-[10.5px] text-[var(--text-muted)] leading-none">
              {relativeTime}
            </span>
            {note.is_pinned && (
              <Icon name="keep" size={13} className="mt-1 text-[var(--text-muted)] rotate-45" />
            )}
          </div>
        </div>

        {/* Preview text or task items */}
        <div className="mt-1 flex flex-col gap-0.5">
          {searchSnippet ? (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-primary)]">{searchSnippet}</span>
            </p>
          ) : lines.length > 0 ? (
            lines.map((line, idx) => (
              <p
                key={idx}
                className="truncate text-[11.5px] leading-snug text-[var(--text-muted)]"
              >
                {line}
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
