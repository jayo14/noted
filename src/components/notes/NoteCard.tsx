import React from "react";
import type { Note, Collection } from "@/types";
import { extractTitleAndPreview, formatDate } from "@/lib/utils";
import { Pin } from "lucide-react";

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  collections: Collection[];
  searchSnippet?: string;
  onClick: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  collections,
  searchSnippet,
  onClick,
}) => {
  const { preview } = extractTitleAndPreview(note.content, note.title);
  const collection = collections.find((c) => c.id === note.collection_id);

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col gap-1.5 px-4 py-3.5 transition-colors border-b border-[var(--border-subtle)] ${
        isSelected
          ? "bg-[var(--bg-surface-active)]"
          : "hover:bg-[var(--bg-surface)] bg-transparent"
      }`}
    >
      {/* Title & Pin row */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          {note.title || "Untitled"}
        </h3>
        {note.is_pinned && (
          <Pin size={12} className="flex-shrink-0 text-[var(--text-muted)] fill-[var(--text-muted)]" />
        )}
      </div>

      {/* Preview Snippet */}
      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
        {searchSnippet ? (
          <span className="font-medium text-[var(--text-primary)]">{searchSnippet}</span>
        ) : (
          preview || "Empty note"
        )}
      </p>

      {/* Date & Collection Tag */}
      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-subtle)]">
        <span>{formatDate(note.updated_at)}</span>
        {collection && (
          <span className="rounded bg-[var(--bg-surface-active)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
            {collection.name}
          </span>
        )}
      </div>
    </div>
  );
};
