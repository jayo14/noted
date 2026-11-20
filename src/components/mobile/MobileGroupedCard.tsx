import React from "react";
import type { Note, Collection } from "@/types";
import { formatNoteDateLabel, extractNoteSnippet } from "@/lib/dateGrouping";
import { Folder } from "lucide-react";

interface MobileGroupedCardProps {
  notes: Note[];
  collections: Collection[];
  onSelectNote: (id: string) => void;
}

export const MobileGroupedCard: React.FC<MobileGroupedCardProps> = ({
  notes,
  collections,
  onSelectNote,
}) => {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
      {notes.map((note, index) => {
        const title = (note.title || "Untitled").trim();
        const dateLabel = formatNoteDateLabel(note.updated_at || note.created_at);
        const snippet = extractNoteSnippet(note);

        // Find collection name, default to "Notes" matching Image 2
        const collection = collections.find((c) => c.id === note.collection_id);
        const collectionName = collection?.name || "Notes";

        return (
          <div
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectNote(note.id);
              }
            }}
            className="group relative cursor-pointer active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors"
          >
            <div className="px-4 py-3">
              {/* Note Title */}
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] truncate tracking-tight">
                {title}
              </h3>

              {/* Date & Preview snippet */}
              <div className="mt-0.5 flex items-center gap-2 text-[13px] truncate">
                <span className="font-normal text-[var(--text-secondary)] flex-shrink-0">
                  {dateLabel}
                </span>
                {snippet && (
                  <span className="text-[var(--text-muted)] truncate opacity-90">
                    {snippet}
                  </span>
                )}
              </div>

              {/* Folder indicator */}
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] font-normal">
                <Folder size={12} strokeWidth={2.2} className="opacity-80" />
                <span>{collectionName}</span>
              </div>
            </div>

            {/* Inset hairline divider matching Apple Notes, omitted on last item */}
            {index < notes.length - 1 && (
              <div className="ml-4 border-b border-black/[0.06] dark:border-white/[0.08]" />
            )}
          </div>
        );
      })}
    </div>
  );
};
