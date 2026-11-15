import React, { useState, useMemo } from "react";
import type { Note, Collection, FilterState } from "@/types";
import { MobileCard } from "./MobileCard";
import {
  Search,
  MoreVertical,
  Plus,
  Home,
  Bookmark,
  Settings,
  X,
  Trash2,
  FolderPlus,
} from "lucide-react";

interface MobileHomeProps {
  notes: Note[];
  collections: Collection[];
  filter: FilterState;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onFilterSection: (section: "all" | "pinned" | "later" | "archive") => void;
  onOpenSettings: () => void;
  onOpenCollections: () => void;
  activeTab: "home" | "search" | "collections" | "settings";
  onChangeTab: (tab: "home" | "search" | "collections" | "settings") => void;
}

export const MobileHome: React.FC<MobileHomeProps> = ({
  notes,
  collections,
  filter,
  onSelectNote,
  onCreateNote,
  onFilterSection,
  onOpenSettings,
  onOpenCollections,
  activeTab,
  onChangeTab,
}) => {
  const [filterPill, setFilterPill] = useState<"all" | "pinned" | "later" | "archive">("all");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Time-of-day greeting matching Image 0
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 17) return "Good afternoon,";
    return "Good evening,";
  }, []);

  // Filter notes based on active pill and search query
  const filteredNotes = useMemo(() => {
    let list = notes.filter((n) => n.deleted_at === null);

    if (filterPill === "pinned") {
      list = list.filter((n) => n.is_pinned);
    } else if (filterPill === "later") {
      const laterCol = collections.find((c) => c.name.toLowerCase() === "later");
      list = list.filter(
        (n) =>
          n.collection_id === laterCol?.id ||
          n.title.toLowerCase().includes("later"),
      );
    } else if (filterPill === "archive") {
      list = notes.filter((n) => n.deleted_at !== null);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          JSON.stringify(n.content || {}).toLowerCase().includes(q),
      );
    }

    return list;
  }, [notes, collections, filterPill, searchQuery]);

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--bg-editor)] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24 no-scrollbar">
        {/* Top Header Row matching Image 0 */}
        <header className="flex items-center justify-between pt-1 pb-4">
          {/* Brand Squircle with Ancient Feather Quill Logo */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141312] text-white shadow-xs">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
          </div>

          {/* Right Action Icons: Search & Overflow Menu */}
          <div className="flex items-center gap-1 text-[var(--text-primary)]">
            <button
              onClick={() => setIsSearchActive((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
              aria-label="Search notes"
            >
              <Search size={19} strokeWidth={2.2} />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical size={19} strokeWidth={2.2} />
              </button>

              {/* Overflow dropdown */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-40 w-44 rounded-2xl bg-[var(--bg-editor)] border border-[var(--border-subtle)] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCollections();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <FolderPlus size={15} />
                      <span>Collections</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <Settings size={15} />
                      <span>Settings</span>
                    </button>
                    <div className="my-1 border-t border-[var(--border-subtle)]" />
                    <button
                      onClick={() => {
                        setFilterPill("archive");
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Trash / Archive</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Inline Search Input if active */}
        {isSearchActive && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--bg-surface)] px-3 py-2 border border-[var(--border-strong)] animate-in fade-in duration-200">
            <Search size={16} className="text-[var(--text-muted)]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in all notes..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* Greeting & Tagline matching Image 0 */}
        <section className="pt-1 pb-4">
          <h1 className="text-[28px] font-bold font-serif-title tracking-tight text-[var(--text-primary)] leading-tight">
            {greeting}
          </h1>
          <p className="text-[13.5px] text-[var(--text-muted)] mt-0.5 tracking-tight">
            Capture thoughts. Make progress.
          </p>
        </section>

        {/* "+ New Note" Full-Width Primary Pill Button matching Image 0 */}
        <div className="pt-1 pb-4">
          <button
            onClick={onCreateNote}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] text-[14px] font-semibold tracking-tight shadow-xs active:scale-[0.985] transition-all cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Note</span>
          </button>
        </div>

        {/* Filter Pills matching Image 0: All, Pinned, Later, Archive */}
        <div className="flex items-center gap-2 pb-4 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "All" },
              { id: "pinned", label: "Pinned" },
              { id: "later", label: "Later" },
              { id: "archive", label: "Archive" },
            ] as const
          ).map((item) => {
            const isActive = filterPill === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setFilterPill(item.id);
                  onFilterSection(item.id);
                }}
                className={`flex h-8 items-center justify-center rounded-full px-4 text-[12.5px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] shadow-2xs"
                    : "bg-[#EFECE6] dark:bg-white/10 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Note Cards List matching Image 0 */}
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <MobileCard
              key={note.id}
              note={note}
              collections={collections}
              onClick={() => onSelectNote(note.id)}
            />
          ))}

          {filteredNotes.length === 0 && (
            <div className="py-16 text-center text-xs text-[var(--text-muted)]">
              No notes found in {filterPill}.
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) matching Image 0 */}
      <button
        onClick={onCreateNote}
        aria-label="Create note"
        className="absolute bottom-20 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>

      {/* Bottom Navigation Bar matching Image 0 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 w-full items-center justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-editor)]/95 backdrop-blur-md px-3 pb-safe select-none">
        {/* Home Tab */}
        <button
          onClick={() => {
            onChangeTab("home");
            setFilterPill("all");
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[10.5px] font-medium transition-colors cursor-pointer ${
            activeTab === "home"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Home size={19} strokeWidth={activeTab === "home" ? 2.6 : 2} />
          <span>Home</span>
        </button>

        {/* Search Tab */}
        <button
          onClick={() => {
            onChangeTab("search");
            setIsSearchActive(true);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[10.5px] font-medium transition-colors cursor-pointer ${
            activeTab === "search" || isSearchActive
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Search size={19} strokeWidth={activeTab === "search" ? 2.6 : 2} />
          <span>Search</span>
        </button>

        {/* Collections Tab */}
        <button
          onClick={() => {
            onChangeTab("collections");
            onOpenCollections();
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[10.5px] font-medium transition-colors cursor-pointer ${
            activeTab === "collections"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Bookmark size={19} strokeWidth={activeTab === "collections" ? 2.6 : 2} />
          <span>Collections</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => {
            onChangeTab("settings");
            onOpenSettings();
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[10.5px] font-medium transition-colors cursor-pointer ${
            activeTab === "settings"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Settings size={19} strokeWidth={activeTab === "settings" ? 2.6 : 2} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};
