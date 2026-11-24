import React, { useState, useMemo, useEffect } from "react";
import type { Note, Collection, FilterState } from "@/types";
import type { UpdateInfo } from "@/services/updater";
import { MobileGroupedCard } from "./MobileGroupedCard";
import { groupNotesByDate } from "@/lib/dateGrouping";
import { extractTextFromJSONContent } from "@/lib/utils";
import { settingsService } from "@/services/settingsService";
import {
  ChevronLeft,
  MoreHorizontal,
  Search,
  SquarePen,
  X,
  Trash2,
  FolderPlus,
  Sparkles,
  Settings,
  Pin,
  Check,
  FileText,
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
  onCheckForUpdates?: () => Promise<void> | void;
  isCheckingUpdate?: boolean;
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
  availableUpdate,
  onOpenUpdateModal,
  onCheckForUpdates,
  isCheckingUpdate = false,
}) => {
  const [filterPill, setFilterPill] = useState<"all" | "pinned" | "later" | "archive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localChecking, setLocalChecking] = useState(false);
  const [, setPrefs] = useState(() => settingsService.getPreferences());

  useEffect(() => {
    return settingsService.subscribe(setPrefs);
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
          extractTextFromJSONContent(n.content).toLowerCase().includes(q),
      );
    }

    return list;
  }, [notes, collections, filterPill, searchQuery]);

  // Group filtered notes by relative date (Today, Yesterday, November, etc.)
  const noteGroups = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);

  const isChecking = isCheckingUpdate || localChecking;

  const handleCheckForUpdatesClick = async () => {
    // If an update is already detected and available, open the update details modal
    if (availableUpdate?.available && onOpenUpdateModal) {
      setIsMenuOpen(false);
      onOpenUpdateModal(availableUpdate);
      return;
    }

    // Otherwise, trigger the update check
    if (onCheckForUpdates) {
      setLocalChecking(true);
      try {
        await onCheckForUpdates();
      } finally {
        setLocalChecking(false);
        setIsMenuOpen(false);
      }
    } else {
      setIsMenuOpen(false);
    }
  };

  // Dynamic header title matching Apple Notes
  const title = useMemo(() => {
    if (filterPill === "pinned") return "Pinned";
    if (filterPill === "later") return "Later";
    if (filterPill === "archive") return "Trash";
    if (filter.collectionId) {
      const col = collections.find((c) => c.id === filter.collectionId);
      if (col) return col.name;
    }
    return "Notes";
  }, [filterPill, filter.collectionId, collections]);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#F2F2F7] dark:bg-[#000000] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Header Row with status bar safe area spacing */}
      <div className="flex-shrink-0 px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-2 z-20">
        <header className="flex items-center justify-between">
          {/* Circular Back button (<) matching Image 2 */}
          <button
            onClick={onOpenCollections}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            aria-label="Back to folders"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>

          {/* Circular More options button (...) matching Image 2 */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
              aria-label="More options"
            >
              <MoreHorizontal size={22} strokeWidth={2.4} />
            </button>

            {/* Overflow options menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[14px]">
                  <button
                    onClick={() => {
                      setFilterPill("all");
                      onFilterSection("all");
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} />
                      <span>All Notes</span>
                    </div>
                    {filterPill === "all" && <Check size={16} className="text-[var(--text-primary)]" />}
                  </button>
                  <button
                    onClick={() => {
                      setFilterPill("pinned");
                      onFilterSection("pinned");
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Pin size={16} />
                      <span>Pinned Notes</span>
                    </div>
                    {filterPill === "pinned" && <Check size={16} className="text-[var(--text-primary)]" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCollections();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <FolderPlus size={16} />
                    <span>Folders & Collections</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleCheckForUpdatesClick}
                    disabled={isChecking}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles
                        size={16}
                        className={`${
                          isChecking
                            ? "animate-spin text-[var(--text-primary)]"
                            : availableUpdate?.available
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      />
                      <span>
                        {isChecking
                          ? "Checking for Updates..."
                          : availableUpdate?.available
                          ? "Update Available"
                          : "Check for Updates"}
                      </span>
                    </div>
                    {availableUpdate?.available && !isChecking && (
                      <span className="h-2 w-2 rounded-full bg-[var(--text-primary)] animate-pulse" />
                    )}
                  </button>
                  <div className="my-1.5 border-t border-black/[0.06] dark:border-white/[0.08]" />
                  <button
                    onClick={() => {
                      setFilterPill("archive");
                      onFilterSection("archive");
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span>Trash</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Large Bold Title & Note Count matching Image 2 */}
        <div className="pt-2 pb-1">
          <h1 className="text-[34px] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-[13.5px] font-normal text-[var(--text-muted)] mt-0.5">
            {`${filteredNotes.length} ${filteredNotes.length === 1 ? "Note" : "Notes"}`}
          </p>
        </div>
      </div>

      {/* Scrollable Grouped Notes Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] no-scrollbar space-y-6">
        {noteGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {/* Section Header (e.g. Yesterday, November) matching Image 2 */}
            <h2 className="text-[20px] font-bold text-[var(--text-primary)] px-1 tracking-tight">
              {group.title}
            </h2>

            {/* Inset Grouped Card */}
            <MobileGroupedCard
              notes={group.notes}
              collections={collections}
              onSelectNote={onSelectNote}
            />
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-sm text-[var(--text-muted)] font-medium">
            {searchQuery.trim() ? (
              <Search size={24} strokeWidth={1.6} className="opacity-45" />
            ) : (
              <FileText size={24} strokeWidth={1.6} className="opacity-45" />
            )}
            <span>{searchQuery.trim() ? "No Matching Notes" : "No Notes"}</span>
          </div>
        )}
      </div>

      {/* Floating Bottom Pill Bar: Pill Search Bar + Circular Compose Button matching Image 2 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-2 pointer-events-none">
        {/* Floating Pill Search Bar */}
        <div className="pointer-events-auto flex flex-1 items-center gap-2.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-md px-4 py-2.5 max-w-[280px]">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border-none p-0 focus:ring-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Floating Circular Compose/New Note Button matching Image 2 */}
        <button
          onClick={onCreateNote}
          className="pointer-events-auto flex h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-md text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
          aria-label="New Note"
          title="New Note"
        >
          <SquarePen size={22} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
