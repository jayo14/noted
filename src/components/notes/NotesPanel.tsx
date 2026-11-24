import React, { useRef, useState, useEffect, useMemo } from "react";
import type { Note, Collection, FilterState } from "@/types";
import { NoteCard } from "./NoteCard";
import { searchService } from "@/services/searchService";
import { formatCompactRelativeTime } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { settingsService, type NotesViewMode } from "@/services/settingsService";

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
  const [prefs, setPrefs] = useState(() => settingsService.getPreferences());
  const viewMode: NotesViewMode = prefs.notesViewMode || "list";
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  useEffect(() => {
    return settingsService.subscribe((nextPrefs) => {
      setPrefs(nextPrefs);
    });
  }, []);

  const handleSetViewMode = (mode: NotesViewMode) => {
    settingsService.updatePreferences({ notesViewMode: mode });
  };

  const searchResults = useMemo(
    () => searchService.filterNotes(notes, filter),
    [notes, filter],
  );

  // Compute most recently edited note for the bottom bar "Last edited: X"
  const mostRecentNote = useMemo(() => {
    return notes.reduce<Note | null>((latest, current) => {
      if (!latest) return current;
      return new Date(current.updated_at).getTime() > new Date(latest.updated_at).getTime()
        ? current
        : latest;
    }, null);
  }, [notes]);

  const lastEditedTime = mostRecentNote
    ? formatCompactRelativeTime(mostRecentNote.updated_at)
    : "—";

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-notes-panel)] select-none">
      {/* Search Bar matching Image 0 with Ctrl K badge */}
      <div className="p-3 pb-2 pt-2.5">
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
            className="w-full rounded-xl bg-[var(--bg-surface)] py-2 pl-9 pr-14 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--border-strong)] transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
            <kbd className="rounded-md border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-surface-active)] px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-[var(--text-secondary)] shadow-2xs">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Action Row: + New Note button and View Switchers matching Image 0 */}
      <div className="flex items-center justify-between px-3 pb-2.5">
        <div className="relative">
          <button
            onClick={onCreateNote}
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
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
        </div>

        {/* View toggles: List vs Grid */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSetViewMode("list")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-bold shadow-2xs"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="List view (Ctrl+Shift+L)"
          >
            <Icon name="segment" size={16} />
          </button>

          <button
            onClick={() => handleSetViewMode("grid")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-bold shadow-2xs"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="Grid view (Ctrl+Shift+L)"
          >
            <Icon name="grid_view" size={16} />
          </button>
        </div>
      </div>

      {/* Note List Scrollable Area */}
      <div
        className={`flex-1 overflow-y-auto ${
          viewMode === "grid"
            ? "grid grid-cols-2 gap-2.5 p-3 content-start"
            : "flex flex-col pt-1 pb-2"
        }`}
      >
        {searchResults.length === 0 ? (
          <div
            className={`${
              viewMode === "grid" ? "col-span-2" : ""
            } p-6 text-center text-xs text-[var(--text-muted)]`}
          >
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
              viewMode={viewMode}
              noteListDensity={prefs.noteListDensity}
              showChecklistPreview={prefs.showChecklistPreview}
              onClick={() => onSelectNote(result.note.id)}
            />
          ))
        )}
      </div>

      {/* Bottom Footer matching Image 0: "{count} notes" on left, "Last edited: X" on right */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2 text-[11px] text-[var(--text-muted)] bg-[var(--bg-notes-panel)]">
        <span>
          {searchResults.length} {searchResults.length === 1 ? "note" : "notes"}
        </span>
        <span>Last edited: {lastEditedTime}</span>
      </div>
    </div>
  );
};
