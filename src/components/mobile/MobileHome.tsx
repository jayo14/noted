import React, { useState, useMemo, useEffect } from "react";
import type { Note, Collection, FilterState } from "@/types";
import type { UpdateInfo } from "@/services/updater";
import { MobileCard } from "./MobileCard";
import { settingsService } from "@/services/settingsService";
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
  Download,
  Sparkles,
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
  availableUpdate?: UpdateInfo | null;
  onOpenUpdateModal?: (info: UpdateInfo) => void;
  onCheckForUpdates?: () => void;
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
  availableUpdate,
  onOpenUpdateModal,
  onCheckForUpdates,
}) => {
  const [filterPill, setFilterPill] = useState<"all" | "pinned" | "later" | "archive">("all");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => settingsService.getPreferences());

  useEffect(() => {
    return settingsService.subscribe(setPrefs);
  }, []);

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
      {/* Fixed Top Pane: Greeting, New Note Button, Header & Filters remain pinned while notes scroll */}
      <div className="flex-shrink-0 px-5 bg-[var(--bg-editor)] z-10 border-b border-transparent">
        {/* Top Header Row with status bar safe area spacing */}
        <header className="flex items-center justify-between pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-3">
          {/* Brand Squircle with Ancient Feather Quill Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141312] text-white shadow-xs">
            <svg
              width="20"
              height="20"
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
          <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
            <button
              onClick={() => setIsSearchActive((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
              aria-label="Search notes"
            >
              <Search size={20} strokeWidth={2.2} />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical size={20} strokeWidth={2.2} />
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
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (availableUpdate && onOpenUpdateModal) {
                          onOpenUpdateModal(availableUpdate);
                        } else if (onCheckForUpdates) {
                          onCheckForUpdates();
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles size={15} className={availableUpdate?.available ? "text-emerald-500" : "text-[var(--text-muted)]"} />
                        <span>Check Updates</span>
                      </div>
                      {availableUpdate?.available && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
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
          <h1
            className={`text-[28px] font-bold tracking-tight text-[var(--text-primary)] leading-tight ${
              prefs.fontFamily === "sans" ? "font-sans-title" : "font-serif-title"
            }`}
          >
            {greeting}
          </h1>
          <p className="text-[13.5px] text-[var(--text-muted)] mt-0.5 tracking-tight">
            Capture thoughts. Make progress.
          </p>
        </section>

        {/* "+ New Note" Full-Width Primary Pill Button */}
        <div className="pt-1 pb-4">
          <button
            onClick={onCreateNote}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] text-[14.5px] font-semibold tracking-tight shadow-xs active:scale-[0.985] transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New Note</span>
          </button>
        </div>

        {/* Filter Pills: All, Pinned, Later, Archive with comfortable touch targets */}
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
                className={`flex h-10 min-h-[40px] items-center justify-center rounded-full px-4 text-[13.5px] font-semibold transition-all cursor-pointer select-none ${
                  isActive
                    ? "bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] shadow-2xs"
                    : "bg-[#EFECE6] dark:bg-white/10 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface-active)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* OTA Update Banner */}
        {availableUpdate && availableUpdate.available && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                <Download size={14} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)] truncate">
                  Update {availableUpdate.tagName} Available
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  Tap to download and update Noted
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenUpdateModal && onOpenUpdateModal(availableUpdate)}
              className="ml-2 flex-shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white transition-colors cursor-pointer"
            >
              Update
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Notes Area - List of notes scrolls while Greeting & New Note pane stays fixed */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] no-scrollbar">
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

      {/* Floating Action Button (FAB) positioned safely above bottom navigation */}
      <button
        onClick={onCreateNote}
        aria-label="Create note"
        className="absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#141312] dark:bg-[var(--accent)] text-white dark:text-[#141312] shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Plus size={26} strokeWidth={2.4} />
      </button>

      {/* Bottom Navigation Bar with taskbar / home indicator safe area inset */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom,0px))] w-full items-center justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-editor)]/95 backdrop-blur-md px-3 pb-[env(safe-area-inset-bottom,0px)] select-none">
        {/* Home Tab */}
        <button
          onClick={() => {
            onChangeTab("home");
            setFilterPill("all");
          }}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors cursor-pointer ${
            activeTab === "home"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Home size={22} strokeWidth={activeTab === "home" ? 2.6 : 2} />
          <span>Home</span>
        </button>

        {/* Search Tab */}
        <button
          onClick={() => {
            onChangeTab("search");
            setIsSearchActive(true);
          }}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors cursor-pointer ${
            activeTab === "search" || isSearchActive
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Search size={22} strokeWidth={activeTab === "search" ? 2.6 : 2} />
          <span>Search</span>
        </button>

        {/* Collections Tab */}
        <button
          onClick={() => {
            onChangeTab("collections");
            onOpenCollections();
          }}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors cursor-pointer ${
            activeTab === "collections"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Bookmark size={22} strokeWidth={activeTab === "collections" ? 2.6 : 2} />
          <span>Collections</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => {
            onChangeTab("settings");
            onOpenSettings();
          }}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors cursor-pointer ${
            activeTab === "settings"
              ? "text-[var(--text-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Settings size={22} strokeWidth={activeTab === "settings" ? 2.6 : 2} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};
