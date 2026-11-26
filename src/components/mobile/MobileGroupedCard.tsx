import React, { useMemo, useRef, useState, useEffect } from "react";
import type { Note, Collection } from "@/types";
import { formatNoteDateLabel, extractNoteSnippet } from "@/lib/dateGrouping";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import { Icon } from "@/components/ui/Icon";
import { Folder, Pin, Trash2 } from "lucide-react";

interface MobileGroupedCardProps {
  notes: Note[];
  collections: Collection[];
  onSelectNote: (id: string) => void;
  onRequestDelete?: (note: Note) => void;
  pendingDeleteNoteId?: string | null;
}

interface SwipeableNoteRowProps {
  note: Note;
  collectionName: string;
  showDivider: boolean;
  onSelectNote: (id: string) => void;
  onRequestDelete?: (note: Note) => void;
  isPendingDelete: boolean;
}

const SWIPE_DELETE_THRESHOLD = 72;
const SWIPE_SNAP_OFFSET = -88;

const SwipeableNoteRow: React.FC<SwipeableNoteRowProps> = React.memo(({
  note,
  collectionName,
  showDivider,
  onSelectNote,
  onRequestDelete,
  isPendingDelete,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef({
    active: false,
    horizontal: false,
    didSwipe: false,
    startX: 0,
    startY: 0,
    currentOffset: 0,
  });

  useEffect(() => {
    if (!isPendingDelete && !isDragging && offsetX !== 0) {
      setOffsetX(0);
      dragStateRef.current.currentOffset = 0;
    }
  }, [isPendingDelete, isDragging, offsetX]);

  const title = (note.title || "Untitled").trim();
  const dateLabel = formatNoteDateLabel(note.updated_at || note.created_at);
  const snippet = extractNoteSnippet(note);
  const iconMeta = classifyNoteIcon(note, collectionName === "Notes" ? undefined : collectionName);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onRequestDelete || e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      horizontal: false,
      didSwipe: false,
      startX: e.clientX,
      startY: e.clientY,
      currentOffset: offsetX,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state.active) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        state.active = false;
        return;
      }
      if (dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        state.horizontal = true;
        state.didSwipe = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const raw = Math.min(0, dx);
    const damped =
      raw < SWIPE_SNAP_OFFSET
        ? SWIPE_SNAP_OFFSET + (raw - SWIPE_SNAP_OFFSET) * 0.35
        : raw;
    const clamped = Math.max(-132, damped);
    state.currentOffset = clamped;
    setOffsetX(clamped);
  };

  const finishSwipe = () => {
    const state = dragStateRef.current;
    if (!state.active) return;
    state.active = false;
    setIsDragging(false);

    if (state.horizontal && state.currentOffset <= -SWIPE_DELETE_THRESHOLD && onRequestDelete) {
      state.currentOffset = SWIPE_SNAP_OFFSET;
      setOffsetX(SWIPE_SNAP_OFFSET);
      onRequestDelete(note);
    } else {
      state.currentOffset = 0;
      setOffsetX(0);
    }
  };

  const revealProgress = Math.min(1, Math.abs(offsetX) / SWIPE_DELETE_THRESHOLD);

  return (
    <div className="relative overflow-hidden" style={{ touchAction: "pan-y" }}>
      {/* Red delete action backdrop revealed on swipe left */}
      {onRequestDelete && (
        <div
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-red-500 dark:bg-red-600 pr-5 text-white transition-opacity"
          style={{ opacity: offsetX < -4 ? 1 : 0 }}
          aria-hidden={offsetX >= -4}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(note);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer"
            style={{
              transform: `scale(${0.82 + 0.18 * revealProgress})`,
              opacity: Math.max(0.35, revealProgress),
            }}
            aria-label={`Delete ${title}`}
          >
            <Trash2 size={18} strokeWidth={2.2} />
            <span className="text-[11px] font-semibold tracking-tight">Delete</span>
          </button>
        </div>
      )}

      {/* Sliding foreground note row */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={finishSwipe}
        onClick={(e) => {
          if (dragStateRef.current.didSwipe) {
            e.preventDefault();
            e.stopPropagation();
            dragStateRef.current.didSwipe = false;
            return;
          }
          onSelectNote(note.id);
        }}
        role="button"
        tabIndex={0}
        aria-label={`${title}, ${iconMeta.accessibleLabel}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectNote(note.id);
          }
        }}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: isDragging ? "transform" : undefined,
        }}
        className="group relative bg-white dark:bg-[#1C1C1E] cursor-pointer active:bg-[#F5F5F7] dark:active:bg-[#262629]"
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
        {showDivider && (
          <div className="ml-16 border-b border-black/[0.06] dark:border-white/[0.08]" />
        )}
      </div>
    </div>
  );
});

SwipeableNoteRow.displayName = "SwipeableNoteRow";

export const MobileGroupedCard: React.FC<MobileGroupedCardProps> = React.memo(({
  notes,
  collections,
  onSelectNote,
  onRequestDelete,
  pendingDeleteNoteId = null,
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
        const collection = note.collection_id ? collectionMap.get(note.collection_id) : undefined;
        const collectionName = collection?.name || "Notes";

        return (
          <SwipeableNoteRow
            key={note.id}
            note={note}
            collectionName={collectionName}
            showDivider={index < notes.length - 1}
            onSelectNote={onSelectNote}
            onRequestDelete={onRequestDelete}
            isPendingDelete={pendingDeleteNoteId === note.id}
          />
        );
      })}
    </div>
  );
});

MobileGroupedCard.displayName = "MobileGroupedCard";
