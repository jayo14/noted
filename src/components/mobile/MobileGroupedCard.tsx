import React, { useMemo } from "react";
import type { Note, Collection } from "@/types";
import { formatNoteDateLabel, extractNoteSnippet } from "@/lib/dateGrouping";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import { Icon } from "@/components/ui/Icon";
import { Folder, Pin } from "lucide-react";

interface MobileGroupedCardProps {
  notes: Note[];
  collections: Collection[];
  onSelectNote: (id: string) => void;
}

export const MobileGroupedCard: React.FC<MobileGroupedCardProps> = React.memo(({
  notes,
  collections,
  onSelectNote,
}) => {
  const collectionMap = useMemo(() => {
    const map = new Map<string, Collection>();
    for (const c of collections) {
      map.set(c.id, c);
    }
    return map;
  }, [collections]);

  if (!notes || notes.length === 0) return null;

  return (
    <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
      {notes.map((note, index) => {
        const title = (note.title || "Untitled").trim();
        const dateLabel = formatNoteDateLabel(note.updated_at || note.created_at);
        const snippet = extractNoteSnippet(note);
        const collection = note.collection_id ? collectionMap.get(note.collection_id) : undefined;
        const collectionName = collection?.name || "Notes";
        const iconMeta = classifyNoteIcon(note, collection?.name);

        return (
          <div
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            role="button"
            tabIndex={0}
            aria-label={`${title}, ${iconMeta.accessibleLabel}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectNote(note.id);
              }
            }}
            className="group relative cursor-pointer active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Smart context-aware icon */}
              <div
                className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#F3F0EA] dark:bg-white/[0.07] text-[var(--text-primary)] border border-black/[0.04] dark:border-white/[0.06]"
                title={iconMeta.categoryName}
              >
                <Icon name={iconMeta.icon} size={17} strokeWidth={1.9} />
              </div>

              {/* Note details */}
              <div className="min-w-0 flex-1">
                {/* Note Title + Pin */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] truncate tracking-tight">
                    {title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {iconMeta.taskStats && (
                      <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-[var(--text-secondary)]">
                        {iconMeta.taskStats.completed}/{iconMeta.taskStats.total}
                      </span>
                    )}
                    {note.is_pinned && (
                      <Pin
                        size={13}
                        className="fill-[var(--text-primary)] text-[var(--text-primary)] rotate-45"
                        aria-label="Pinned"
                      />
                    )}
                  </div>
                </div>

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
            </div>

            {/* Inset hairline divider matching Apple Notes, omitted on last item */}
            {index < notes.length - 1 && (
              <div className="ml-16 border-b border-black/[0.06] dark:border-white/[0.08]" />
            )}
          </div>
        );
      })}
    </div>
  );
});

MobileGroupedCard.displayName = "MobileGroupedCard";
