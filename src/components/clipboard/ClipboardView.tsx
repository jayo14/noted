import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ClipboardCategory, ClipboardItem } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { sanitizeClipboardHtml } from "@/services/clipboardService";
import { formatCompactRelativeTime } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ClipboardViewProps {
  items: ClipboardItem[];
  isPaused: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCopyItem: (item: ClipboardItem) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onClearUnpinned: () => Promise<void>;
  onTogglePause: () => Promise<void>;
  onSaveAsNote: (item: ClipboardItem) => Promise<void>;
  autoFocusSearch?: boolean;
}

type FilterChip = "all" | "pinned" | "image" | "url" | "code" | "command";

const CATEGORY_META: Record<ClipboardCategory, { label: string; icon: string }> = {
  image: { label: "Image", icon: "image" },
  url: { label: "Link", icon: "link" },
  email: { label: "Email", icon: "mail" },
  color: { label: "Color", icon: "palette" },
  command: { label: "Command", icon: "terminal" },
  code: { label: "Code", icon: "code" },
  rich_text: { label: "Rich Text", icon: "notes" },
  text: { label: "Text", icon: "description" },
};

const FILTER_CHIPS: { id: FilterChip; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "clipboard" },
  { id: "pinned", label: "Pinned", icon: "keep" },
  { id: "image", label: "Images", icon: "image" },
  { id: "url", label: "Links", icon: "link" },
  { id: "code", label: "Code", icon: "code" },
  { id: "command", label: "Commands", icon: "terminal" },
];

function resolveImageSrc(path: string | null): string {
  if (!path) return "";
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return convertFileSrc(path);
    }
  } catch {
    // Fallback below
  }
  return path;
}

export const ClipboardView: React.FC<ClipboardViewProps> = ({
  items,
  isPaused,
  searchQuery,
  onSearchChange,
  onCopyItem,
  onTogglePin,
  onDeleteItem,
  onClearUnpinned,
  onTogglePause,
  onSaveAsNote,
  autoFocusSearch = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (autoFocusSearch) {
      searchInputRef.current?.focus();
    }
  }, [autoFocusSearch]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeFilter === "pinned" && !item.is_pinned) return false;
      if (
        activeFilter !== "all" &&
        activeFilter !== "pinned" &&
        item.category !== activeFilter
      ) {
        return false;
      }
      if (q && !item.content_text.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, activeFilter, searchQuery]);

  // Keep selectedIndex within bounds when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    if (selectedIndex >= filteredItems.length && filteredItems.length > 0) {
      setSelectedIndex(filteredItems.length - 1);
    }
  }, [filteredItems.length, selectedIndex]);

  const unpinnedCount = useMemo(
    () => items.filter((i) => !i.is_pinned).length,
    [items],
  );

  const handleCopy = useCallback(
    async (item: ClipboardItem) => {
      await onCopyItem(item);
      setCopiedId(item.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 1500);
    },
    [onCopyItem],
  );

  const scrollCardIntoView = useCallback((index: number) => {
    const target = filteredItems[index];
    if (!target) return;
    const el = cardRefs.current.get(target.id);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [filteredItems]);

  // Global keyboard shortcuts inside ClipboardView (Ctrl+K/F, ArrowUp/Down, Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "f")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (filteredItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(selectedIndex + 1, filteredItems.length - 1);
        setSelectedIndex(next);
        scrollCardIntoView(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(selectedIndex - 1, 0);
        setSelectedIndex(prev);
        scrollCardIntoView(prev);
      } else if (e.key === "Enter" && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) void handleCopy(item);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, selectedIndex, scrollCardIntoView, handleCopy]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollTop(el.scrollTop > 220);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="relative flex h-full flex-1 flex-col bg-[var(--bg-editor)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)] px-6 py-5 bg-[var(--bg-editor)]">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <Icon name="clipboard" size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Clipboard
                </h1>
                <p className="text-[11.5px] text-[var(--text-muted)]">
                  {searchQuery.trim()
                    ? `${filteredItems.length} matching ${filteredItems.length === 1 ? "item" : "items"}`
                    : `${items.length} ${items.length === 1 ? "item" : "items"}`}{" "}
                  · Persisted locally (500 unpinned max) · Super+V
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePause}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isPaused
                    ? "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                }`}
                title={isPaused ? "Resume clipboard capture" : "Pause clipboard capture"}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPaused ? "bg-[var(--text-subtle)]" : "bg-emerald-500 animate-pulse"
                  }`}
                />
                <span>{isPaused ? "Paused" : "Capturing"}</span>
              </button>

              {unpinnedCount > 0 && (
                <button
                  onClick={onClearUnpinned}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Clear unpinned clipboard history"
                >
                  <Icon name="delete" size={14} />
                  <span>Clear Unpinned</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative flex items-center">
            <Icon
              name="search"
              size={16}
              className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchQuery) {
                  onSearchChange("");
                }
              }}
              placeholder="Search everything you've copied..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2.5 pl-10 pr-40 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--border-strong)] transition-colors"
            />
            <div className="absolute right-3 flex items-center gap-2">
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Clear clipboard search"
                >
                  <Icon name="close" size={15} />
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[var(--text-subtle)] pointer-events-none">
                  <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-editor)] px-1.5 py-0.5 font-mono">
                    ↑↓
                  </kbd>
                  <span>select</span>
                  <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-editor)] px-1.5 py-0.5 font-mono">
                    Enter
                  </kbd>
                  <span>copy</span>
                </span>
              )}
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  <Icon name={chip.icon} size={13} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Clipboard List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth px-6 py-4"
      >
        <div className="mx-auto max-w-4xl space-y-2.5 pb-12">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)]">
              <Icon name="clipboard" size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {searchQuery ? "No matching clips found" : "Clipboard history is empty"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {searchQuery
                  ? "Try a different search keyword or filter."
                  : "Copy any text, link, code, or image on Linux and it will appear here automatically."}
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.text;
              const isCopied = copiedId === item.id;
              const isHighlighted = idx === selectedIndex;
              const relTime = formatCompactRelativeTime(item.last_copied_at);

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(item.id, el);
                    else cardRefs.current.delete(item.id);
                  }}
                  onClick={() => {
                    setSelectedIndex(idx);
                    void handleCopy(item);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void handleCopy(item);
                    }
                  }}
                  className={`group relative flex flex-col gap-2.5 rounded-2xl border p-4 transition-all cursor-pointer shadow-2xs ${
                    isHighlighted
                      ? "border-[var(--border-strong)] bg-[var(--bg-surface)]/80 ring-1 ring-[var(--accent)]/15"
                      : "border-[var(--border-subtle)] bg-[var(--bg-notes-panel)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]/60"
                  }`}
                >
                  {/* Card Header: Category badge, timestamp, & quick actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        <Icon name={meta.icon} size={12} />
                        <span>{meta.label}</span>
                      </span>

                      {item.image_width && item.image_height && (
                        <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                          {item.image_width}×{item.image_height}
                        </span>
                      )}

                      <span className="text-[11px] text-[var(--text-muted)]">{relTime}</span>

                      {isCopied && (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] px-2 py-0.5 text-[10.5px] font-semibold">
                          <Icon name="check" size={11} />
                          Copied
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleCopy(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Icon name="content_copy" size={14} />
                      </button>
                      <button
                        onClick={() => onSaveAsNote(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Save as Note"
                      >
                        <Icon name="edit_note" size={15} />
                      </button>
                      <button
                        onClick={() => onTogglePin(item.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                          item.is_pinned
                            ? "text-[var(--text-primary)] bg-[var(--bg-surface-active)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                        }`}
                        title={item.is_pinned ? "Unpin" : "Pin"}
                      >
                        <Icon name="keep" size={14} filled={item.is_pinned} className="rotate-45" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content Preview maintaining original fidelity */}
                  {item.content_type === "image" && item.image_path ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] max-h-60 flex items-center justify-center">
                      <img
                        src={resolveImageSrc(item.image_path)}
                        alt={item.content_text}
                        loading="lazy"
                        className="max-h-60 w-auto object-contain"
                      />
                    </div>
                  ) : item.category === "color" ? (
                    <div className="flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-lg border border-[var(--border-strong)] shadow-2xs flex-shrink-0"
                        style={{ backgroundColor: item.content_text.trim() }}
                      />
                      <code className="font-mono text-xs font-medium text-[var(--text-primary)]">
                        {item.content_text.trim()}
                      </code>
                    </div>
                  ) : item.category === "code" || item.category === "command" ? (
                    <pre className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 font-mono text-[12px] leading-relaxed text-[var(--text-primary)] max-h-48 select-text">
                      {item.content_text}
                    </pre>
                  ) : item.content_type === "html" && item.content_html ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-[var(--text-primary)] max-h-48 overflow-hidden select-text [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeClipboardHtml(item.content_html),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--text-primary)] line-clamp-6 select-text">
                      {item.content_text}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Smooth Back-to-Top Floating Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-5 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <Icon name="arrow_upward" size={16} />
        </button>
      )}
    </div>
  );
};
