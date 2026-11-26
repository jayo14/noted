import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Note, Collection, FilterState } from "@/types";
import type { UpdateInfo } from "@/services/updater";
import { MobileGroupedCard } from "./MobileGroupedCard";
import { HiddenNotesPinModal, type HiddenPinModalMode } from "./HiddenNotesPinModal";
import { groupNotesByDate } from "@/lib/dateGrouping";
import { extractTextFromJSONContent } from "@/lib/utils";
import { settingsService } from "@/services/settingsService";
import { hiddenNotesService } from "@/services/hiddenNotesService";
import {
  ChevronLeft,
  MoreHorizontal,
  Search,
  SquarePen,
  X,
  Trash2,
  Sparkles,
  Settings,
  Pin,
  Check,
  FileText,
  Lock,
  EyeOff,
  Eye,
} from "lucide-react";

interface MobileHomeProps {
  notes: Note[];
  collections: Collection[];
  filter: FilterState;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote?: (id: string) => Promise<void> | void;
  onTogglePinNote?: (id: string) => Promise<void> | void;
  onToggleHideNote?: (id: string) => Promise<void> | void;
  onFilterSection: (section: "all" | "pinned" | "later" | "archive") => void;
  onOpenSettings: () => void;
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
  onDeleteNote,
  onTogglePinNote,
  onToggleHideNote,
  onFilterSection,
  onOpenSettings,
  availableUpdate,
  onOpenUpdateModal,
  onCheckForUpdates,
  isCheckingUpdate = false,
}) => {
  const [filterPill, setFilterPill] = useState<"all" | "pinned" | "later" | "archive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localChecking, setLocalChecking] = useState(false);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [heldNote, setHeldNote] = useState<Note | null>(null);
  const [isHiddenUnlocked, setIsHiddenUnlocked] = useState(false);
  const [pinModalState, setPinModalState] = useState<{
    open: boolean;
    mode: HiddenPinModalMode;
    pendingHideNoteId?: string | null;
  }>({ open: false, mode: "unlock", pendingHideNoteId: null });
  const [pullOffset, setPullOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const [, setPrefs] = useState(() => settingsService.getPreferences());

  useEffect(() => {
    return settingsService.subscribe(setPrefs);
  }, []);

  // Auto-lock hidden notes when app goes to background
  useEffect(() => {
    if (!isHiddenUnlocked || typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setIsHiddenUnlocked(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isHiddenUnlocked]);

  // Filter notes based on active pill, hidden lock state, and search query
  const filteredNotes = useMemo(() => {
    let list: Note[];

    if (isHiddenUnlocked) {
      list = notes.filter((n) => n.deleted_at === null && Boolean(n.is_hidden));
    } else if (filterPill === "archive") {
      list = notes.filter((n) => n.deleted_at !== null && !n.is_hidden);
    } else {
      list = notes.filter((n) => n.deleted_at === null && !n.is_hidden);

      if (filterPill === "pinned") {
        list = list.filter((n) => n.is_pinned);
      } else if (filterPill === "later") {
        const laterCol = collections.find((c) => c.name.toLowerCase() === "later");
        list = list.filter(
          (n) =>
            n.collection_id === laterCol?.id ||
            n.title.toLowerCase().includes("later"),
        );
      }
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
  }, [notes, collections, filterPill, searchQuery, isHiddenUnlocked]);

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

  const openHiddenUnlockFlow = async () => {
    if (isHiddenUnlocked) return;
    const configured = await hiddenNotesService.hasPinConfigured();
    setPinModalState({
      open: true,
      mode: configured ? "unlock" : "setup",
      pendingHideNoteId: null,
    });
  };

  const handleRequestHideNote = async (note: Note) => {
    setHeldNote(null);
    if (note.is_hidden) {
      await onToggleHideNote?.(note.id);
      return;
    }
    const configured = await hiddenNotesService.hasPinConfigured();
    if (!configured) {
      setPinModalState({
        open: true,
        mode: "setup",
        pendingHideNoteId: note.id,
      });
      return;
    }
    await onToggleHideNote?.(note.id);
  };

  const handlePullStart = (clientY: number) => {
    if (isHiddenUnlocked) return;
    const scroller = scrollContainerRef.current;
    if (scroller && scroller.scrollTop <= 0) {
      pullStartYRef.current = clientY;
    } else {
      pullStartYRef.current = null;
    }
  };

  const handlePullMove = (clientY: number) => {
    if (pullStartYRef.current === null || isHiddenUnlocked) return;
    const dy = clientY - pullStartYRef.current;
    if (dy <= 0) {
      setPullOffset(0);
      return;
    }
    const damped = Math.min(108, dy * 0.52);
    setPullOffset(damped);
  };

  const handlePullEnd = () => {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullOffset >= 64) {
      setPullOffset(0);
      void openHiddenUnlockFlow();
    } else {
      setPullOffset(0);
    }
  };

  // Dynamic header title matching Apple Notes
  const title = useMemo(() => {
    if (isHiddenUnlocked) return "Hidden Notes";
    if (filterPill === "pinned") return "Pinned";
    if (filterPill === "later") return "Later";
    if (filterPill === "archive") return "Trash";
    if (filter.collectionId) {
      const col = collections.find((c) => c.id === filter.collectionId);
      if (col) return col.name;
    }
    return "Notes";
  }, [isHiddenUnlocked, filterPill, filter.collectionId, collections]);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#F2F2F7] dark:bg-[#000000] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Header Row with status bar safe area spacing */}
      <div className="flex-shrink-0 px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-2 z-20">
        <header className="flex items-center justify-between">
          {/* Left: Back/Lock pill when inside a filtered view or Hidden Notes */}
          {isHiddenUnlocked ? (
            <button
              onClick={() => setIsHiddenUnlocked(false)}
              className="flex h-11 items-center gap-1.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs px-3.5 text-[13.5px] font-semibold text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
              aria-label="Lock hidden notes"
            >
              <Lock size={15} strokeWidth={2.2} />
              <span>Lock</span>
            </button>
          ) : filterPill !== "all" ? (
            <button
              onClick={() => {
                setFilterPill("all");
                onFilterSection("all");
              }}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
              aria-label="Back to all notes"
            >
              <ChevronLeft size={24} strokeWidth={2.4} />
            </button>
          ) : (
            <div className="h-11" />
          )}

          {/* Right header actions: Settings cog + More options (...) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={20} strokeWidth={2.2} />
            </button>

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
                      setIsHiddenUnlocked(false);
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
                    {filterPill === "pinned" && !isHiddenUnlocked && <Check size={16} className="text-[var(--text-primary)]" />}
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

      {/* Scrollable Grouped Notes Area with Pull-Down-to-Unlock Hidden Notes */}
      <div
        ref={scrollContainerRef}
        onTouchStart={(e) => e.touches[0] && handlePullStart(e.touches[0].clientY)}
        onTouchMove={(e) => e.touches[0] && handlePullMove(e.touches[0].clientY)}
        onTouchEnd={handlePullEnd}
        onTouchCancel={handlePullEnd}
        className="flex-1 overflow-y-auto px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] no-scrollbar space-y-6"
      >
        {pullOffset > 6 && !isHiddenUnlocked && (
          <div
            className="flex items-center justify-center transition-all duration-150"
            style={{ height: `${Math.min(56, pullOffset * 0.65)}px`, opacity: Math.min(1, pullOffset / 56) }}
          >
            <div className="flex items-center gap-2 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 border border-black/[0.08] dark:border-white/[0.1] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] shadow-xs">
              <Lock size={13} />
              <span>{pullOffset >= 64 ? "Release to unlock Hidden Notes" : "Pull down for Hidden Notes"}</span>
            </div>
          </div>
        )}

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
              onRequestDelete={onDeleteNote ? (note) => setPendingDeleteNote(note) : undefined}
              onTogglePin={onTogglePinNote ? (note) => onTogglePinNote(note.id) : undefined}
              onHoldNote={onToggleHideNote ? (note) => setHeldNote(note) : undefined}
              pendingDeleteNoteId={pendingDeleteNote?.id ?? null}
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

      {/* Floating Bottom Pill Bar: Liquid-Glass Search Bar + Circular Compose Button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-2 pointer-events-none">
        {/* Floating Liquid-Glass Pill Search Bar */}
        <div className="liquid-glass pointer-events-auto flex flex-1 items-center gap-2.5 rounded-full px-4 py-2.5 max-w-[280px] transition-all">
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

        {/* Floating Liquid-Glass Circular Compose/New Note Button */}
        <button
          onClick={onCreateNote}
          className="liquid-glass pointer-events-auto flex h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
          aria-label="New Note"
          title="New Note"
        >
          <SquarePen size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* Swipe-to-Delete Confirmation Dialog */}
      {pendingDeleteNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-6 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-delete-dialog-title"
          onClick={() => {
            if (!isDeletingNote) setPendingDeleteNote(null);
          }}
        >
          <div
            className="w-full max-w-xs rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-5 shadow-2xl text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/12 text-red-500">
              <Trash2 size={20} strokeWidth={2.2} />
            </div>
            <h3
              id="mobile-delete-dialog-title"
              className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight"
            >
              Delete Note?
            </h3>
            <p className="mt-1.5 text-[13.5px] text-[var(--text-muted)] leading-snug">
              "{pendingDeleteNote.title?.trim() || "Untitled"}" will be moved to Trash.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeletingNote}
                onClick={() => setPendingDeleteNote(null)}
                className="flex-1 rounded-xl bg-black/[0.06] dark:bg-white/[0.1] py-2.5 text-[14px] font-semibold text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingNote}
                onClick={async () => {
                  if (!onDeleteNote) return;
                  setIsDeletingNote(true);
                  try {
                    await onDeleteNote(pendingDeleteNote.id);
                    setPendingDeleteNote(null);
                  } finally {
                    setIsDeletingNote(false);
                  }
                }}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-2.5 text-[14px] font-semibold text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingNote ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hold Note Card Action Dialog (Hide / Unhide Note) */}
      {heldNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-6 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Note actions"
          onClick={() => setHeldNote(null)}
        >
          <div
            className="w-full max-w-xs rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 pb-3 text-[13px] font-semibold text-[var(--text-muted)] truncate border-b border-black/[0.06] dark:border-white/[0.08]">
              {heldNote.title?.trim() || "Untitled"}
            </p>
            <button
              type="button"
              onClick={() => void handleRequestHideNote(heldNote)}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 transition-all cursor-pointer"
            >
              {heldNote.is_hidden ? <Eye size={18} /> : <EyeOff size={18} />}
              <span>{heldNote.is_hidden ? "Unhide Note" : "Hide Note"}</span>
            </button>
            <button
              type="button"
              onClick={() => setHeldNote(null)}
              className="mt-1 w-full rounded-xl bg-black/[0.05] dark:bg-white/[0.08] py-2.5 text-[14px] font-semibold text-[var(--text-secondary)] active:scale-98 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4-Digit PIN & Passkey / Biometric Modal */}
      <HiddenNotesPinModal
        isOpen={pinModalState.open}
        mode={pinModalState.mode}
        onClose={() => setPinModalState({ open: false, mode: "unlock", pendingHideNoteId: null })}
        onSuccess={async () => {
          const pendingId = pinModalState.pendingHideNoteId;
          const modalMode = pinModalState.mode;
          setPinModalState({ open: false, mode: "unlock", pendingHideNoteId: null });
          if (pendingId) {
            await onToggleHideNote?.(pendingId);
          } else if (modalMode === "unlock" || modalMode === "setup") {
            setIsHiddenUnlocked(true);
          }
        }}
      />
    </div>
  );
};
