import React, { useRef, useState } from "react";
import type { Note, Collection, FilterState, SortOption } from "@/types";
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
  onSortChange?: (sortBy: SortOption) => void;
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
  onSortChange,
  onToggleChecklistFilter,
  onEmptyTrash,
  searchInputRef: externalSearchRef,
}) => {
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const searchInputRef = externalSearchRef || internalSearchRef;
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

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
    : "Recently";

  return (
    <div className="flex h-full w-[285px] flex-shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-notes-panel)] select-none">
      {/* Search Input Bar matching Image 1 */}
      <div className="p-3 pb-2">
        <div className="relative flex items-center">
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
            className="w-full rounded-xl bg-[#EFECE5] dark:bg-[#252522] py-2 pl-9 pr-14 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-transparent focus:border-[var(--border-strong)] transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
            <kbd className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-editor)] px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-[var(--text-muted)]">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Action Row: + New Note button and View Switchers */}
      <div className="flex items-center justify-between px-3 pb-2.5">
        <div className="relative">
          <button
            onClick={onCreateNote}
            className="flex items-center gap-1.5 rounded-full bg-[#161514] dark:bg-[#f7f5f0] px-3.5 py-1.5 text-xs font-semibold text-white dark:text-[#161514] hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            title="Create note"
          >
            <Icon name="add" size={15} />
            <span className="text-[12.5px]">New Note</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsNewMenuOpen((prev) => !prev);
              }}
              className="hover:opacity-75"
            >
              <Icon name="expand_more" size={14} />
            </span>
          </button>

          {/* New note dropdown */}
          {isNewMenuOpen && (
            <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1 shadow-lg">
              <button
                onClick={() => {
                  onCreateNote();
                  setIsNewMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              >
                <Icon name="edit_note" size={15} />
                <span>Blank Note</span>
              </button>
              {onToggleChecklistFilter && (
                <button
                  onClick={() => {
                    onToggleChecklistFilter();
                    setIsNewMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Icon name="check_box" size={15} />
                  <span>Checklist Note</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* View toggles: List & Grid icons matching Image 1 */}
        <div className="flex items-center gap-1">
          {filter.section === "trash" && onEmptyTrash && searchResults.length > 0 && (
            <button
              onClick={onEmptyTrash}
              className="mr-1 rounded p-1 text-xs text-red-500 hover:bg-red-500/10"
              title="Empty Trash"
            >
              <Icon name="delete" size={15} />
            </button>
          )}

          <button
            onClick={() => setViewMode("list")}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="List view"
          >
            <Icon name="segment" size={17} />
          </button>

          <button
            onClick={() => setViewMode("grid")}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="Grid view"
          >
            <Icon name="grid_view" size={16} />
          </button>
        </div>
      </div>

      {/* Note Cards List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {searchResults.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-[var(--text-muted)]">
            <Icon name="description" size={32} className="mb-2 text-[var(--text-subtle)] opacity-40" />
            <p className="text-xs font-medium">
              {filter.searchQuery
                ? `No notes matching "${filter.searchQuery}"`
                : filter.section === "trash"
                ? "Trash is empty"
                : "No notes here yet"}
            </p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-1" : "flex flex-col"}>
            {searchResults.map(({ note, snippet }) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                collections={collections}
                searchSnippet={snippet}
                onClick={() => onSelectNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Bar: note count and Last edited */}
      <div className="flex h-9 items-center justify-between border-t border-[var(--border-subtle)] px-4 text-[11px] text-[var(--text-muted)] bg-[var(--bg-notes-panel)]">
        <span>{searchResults.length} notes</span>
        <span>Last edited: {lastEditedTime}</span>
      </div>
    </div>
  );
};
