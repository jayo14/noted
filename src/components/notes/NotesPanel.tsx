import React, { useRef } from "react";
import type { Note, Collection, FilterState } from "@/types";
import { NoteCard } from "./NoteCard";
import { searchService } from "@/services/searchService";
import { Search, Plus, X, FileText, Trash2 } from "lucide-react";

interface NotesPanelProps {
  notes: Note[];
  collections: Collection[];
  filter: FilterState;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onSearchChange: (query: string) => void;
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
  onEmptyTrash,
  searchInputRef: externalSearchRef,
}) => {
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const searchInputRef = externalSearchRef || internalSearchRef;

  const searchResults = searchService.filterNotes(notes, filter);

  const currentCollection = collections.find((c) => c.id === filter.collectionId);

  const getSectionTitle = () => {
    switch (filter.section) {
      case "all":
        return "All Notes";
      case "pinned":
        return "Pinned";
      case "collection":
        return currentCollection ? currentCollection.name : "Collection";
      case "trash":
        return "Trash";
      default:
        return "Notes";
    }
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-app)]">
      {/* Top Header with title and New Note action */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            {getSectionTitle()}
          </h2>
          <span className="text-xs text-[var(--text-subtle)]">
            ({searchResults.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {filter.section === "trash" ? (
            onEmptyTrash && searchResults.length > 0 && (
              <button
                onClick={onEmptyTrash}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                title="Empty Trash"
              >
                <Trash2 size={13} />
                <span>Empty</span>
              </button>
            )
          ) : (
            <button
              onClick={onCreateNote}
              className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
              title="New Note (Cmd+N)"
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 text-[var(--text-subtle)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes..."
            value={filter.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md bg-[var(--bg-surface)] py-1.5 pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none transition-colors border border-transparent focus:border-[var(--border-strong)]"
          />
          {filter.searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <FileText size={28} className="mb-2 text-[var(--text-subtle)] opacity-40" />
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {filter.searchQuery
                ? `No notes matching "${filter.searchQuery}"`
                : filter.section === "trash"
                ? "Trash is empty"
                : "No notes yet"}
            </p>
            {filter.section !== "trash" && !filter.searchQuery && (
              <button
                onClick={onCreateNote}
                className="mt-3 text-xs text-[var(--text-primary)] underline underline-offset-4 hover:opacity-80"
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div>
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
    </div>
  );
};
