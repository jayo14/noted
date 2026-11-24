import React from "react";
import type { Note, Collection } from "@/types";
import { extractTextFromJSONContent } from "@/lib/utils";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import { Icon } from "@/components/ui/Icon";
import { Calendar, Clock, Pin, Check } from "lucide-react";

interface MobileCardProps {
  note: Note;
  collections: Collection[];
  onClick: () => void;
}

interface ParsedTask {
  text: string;
  checked: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = React.memo(({ note, collections, onClick }) => {
  const title = note.title?.trim() || "Untitled";
  const collection = collections.find((c) => c.id === note.collection_id);
  const iconMeta = classifyNoteIcon(note, collection?.name);

  // Extract checklist tasks, quote, or plain text preview
  const tasks: ParsedTask[] = [];
  let isChecklistNote = false;
  let quoteText: string | null = null;
  let plainText = "";

  const content = note.content;
  if (content && Array.isArray(content.content)) {
    for (const node of content.content) {
      if (node.type === "taskList" && Array.isArray(node.content)) {
        isChecklistNote = true;
        for (const item of node.content) {
          if (tasks.length >= 3) break;
          const text = extractTextFromJSONContent(item).trim();
          if (text) {
            tasks.push({
              text,
              checked: item.attrs?.checked === true,
            });
          }
        }
      } else if (node.type === "blockquote") {
        const text = extractTextFromJSONContent(node).trim();
        if (text && !quoteText) {
          quoteText = text;
        }
      } else if (node.type === "paragraph" || node.type === "heading") {
        const text = extractTextFromJSONContent(node).trim();
        if (text && text !== title && !plainText) {
          plainText = text;
        }
      }
    }
  }

  const formattedDate = (() => {
    const d = note.updated_at ? new Date(note.updated_at) : new Date();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    if (isYesterday) {
      return "Yesterday";
    }
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  })();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}, ${iconMeta.accessibleLabel}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex w-full justify-between items-start rounded-2xl bg-[#F6F3EE] dark:bg-[#1E1E1C] p-4 text-left transition-all active:scale-[0.99] cursor-pointer border border-[var(--border-subtle)]/50 shadow-2xs hover:shadow-xs"
    >
      {/* Left Content column */}
      <div className="flex-1 min-w-0 pr-3 flex flex-col justify-between self-stretch">
        <div>
          {/* Note Title */}
          <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-primary)] leading-snug truncate">
            {title}
          </h3>

          {/* Note Preview Body */}
          <div className="mt-1.5 space-y-1">
            {isChecklistNote && tasks.length > 0 ? (
              tasks.slice(0, 3).map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[13px]">
                  <div
                    className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border ${
                      task.checked
                        ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]"
                        : "border-[var(--text-subtle)] bg-transparent"
                    }`}
                  >
                    {task.checked && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span
                    className={`truncate ${
                      task.checked
                        ? "line-through text-[var(--text-subtle)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))
            ) : quoteText ? (
              <p className="text-[13px] italic font-serif text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                "{quoteText}"
              </p>
            ) : (
              <p className="text-[13px] text-[var(--text-muted)] line-clamp-2 leading-normal">
                {plainText || "No additional text"}
              </p>
            )}
          </div>
        </div>

        {/* Date & task progress footer */}
        <div className="mt-3 flex items-center gap-2 text-[11.5px] font-medium text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            {formattedDate.startsWith("Today") ? (
              <Calendar size={13} className="text-[var(--text-muted)]" />
            ) : (
              <Clock size={13} className="text-[var(--text-muted)]" />
            )}
            <span>{formattedDate}</span>
          </div>
          {iconMeta.taskStats && (
            <span className="rounded-full bg-black/[0.06] dark:bg-white/[0.08] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--text-secondary)]">
              {iconMeta.taskStats.completed}/{iconMeta.taskStats.total}
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Pin icon & Context-Aware Squircle */}
      <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 pl-1">
        <div className="h-5 flex items-center justify-end">
          {note.is_pinned && (
            <Pin
              size={14}
              className="fill-[var(--text-primary)] text-[var(--text-primary)] rotate-45 transform"
            />
          )}
        </div>

        <div
          className="h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center bg-[#EFECE6] dark:bg-white/10 text-[var(--text-primary)] border border-[var(--border-subtle)]/70 shadow-2xs"
          title={iconMeta.categoryName}
        >
          <Icon name={iconMeta.icon} size={21} strokeWidth={1.85} />
        </div>
      </div>
    </div>
  );
});

MobileCard.displayName = "MobileCard";
