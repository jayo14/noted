import React, { useRef } from "react";
import type { Note, Collection, FilterState } from "@/types";
import { NoteCard } from "./NoteCard";
import { searchService } from "@/services/searchService";
import { formatCompactRelativeTime } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

interface NotesPanelProps {
  notes: Note[];
  collections: Collection[];
  filter: FilterState;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onSearchChange: (query: string) => void;
  onSortChange?: (sortBy: any) => void;
  onToggleChecklistFilter?: () => void;
  onEmptyTrash?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  collections,
  filter,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onSearchChange,
  searchInputRef: externalSearchRef,
}) => {
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const searchInputRef = externalSearchRef || internalSearchRef;

  const searchResults = searchService.filterNotes(notes, filter);

  // Compute most recently edited note for the bottom bar "Last edited: X"
  const mostRecentNote = notes.reduce<Note | null>((latest, current) => {
    if (!latest) return current;
    return new Date(current.updated_at).getTime() > new Date(latest.updated_at).getTime()
      ? current
      : latest;
  }, null);

  const lastEditedTime = mostRecentNote
    ? formatCompactRelativeTime(mostRecentNote.updated_at)
    : "recently";

  return (
    <div className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-notes-panel)] select-none">
      {/* Top Search & Compose Row matching Apple Notes (Image 0) */}
      <div className="flex items-center gap-2 p-3 pb-2 pt-2.5">
        {/* Search pill input */}
        <div className="relative flex flex-1 items-center">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes..."
            value={filter.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl bg-[#edeae1] dark:bg-[#252422] py-1.5 pl-8 pr-3 text-[12.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-transparent focus:border-[var(--border-strong)] transition-all"
          />
        </div>

        {/* Compose / New Note Button (Apple-style rounded square) */}
        <button
          onClick={onCreateNote}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141312] dark:bg-[#f7f5f0] text-white dark:text-[#141312] hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer flex-shrink-0"
          title="New Note (Ctrl+N)"
          aria-label="New Note"
        >
          <Icon name="edit_square" size={17} />
        </button>
      </div>

      {/* Note List Scrollable Area */}
      <div className="flex-1 overflow-y-auto pt-1 pb-2">
        {searchResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            {filter.searchQuery ? "No matching notes found." : "No notes in this view."}
          </div>
        ) : (
          searchResults.map((result) => (
            <NoteCard
              key={result.note.id}
              note={result.note}
              isSelected={result.note.id === selectedNoteId}
              collections={collections}
              searchSnippet={result.snippet}
              onClick={() => onSelectNote(result.note.id)}
            />
          ))
        )}
      </div>

      {/* Bottom Notes Panel Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2 text-[11px] text-[var(--text-muted)] bg-[var(--bg-notes-panel)]">
        <span>{searchResults.length} {searchResults.length === 1 ? "note" : "notes"}</span>
        <span>Last edited: {lastEditedTime}</span>
      </div>
    </div>
  );
};
