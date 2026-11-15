import React from "react";
import type { Note, Collection } from "@/types";
import { formatCompactRelativeTime, extractTextFromJSONContent } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Pin,
  Lightbulb,
  ShoppingCart,
  Check,
} from "lucide-react";

interface MobileCardProps {
  note: Note;
  collections: Collection[];
  onClick: () => void;
}

interface ParsedTask {
  text: string;
  checked: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({ note, onClick }) => {
  const title = note.title?.trim() || "Untitled";
  const titleLower = title.toLowerCase();

  // Extract checklist tasks if any
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

  // Format timestamp like Image 0: "Today, 8:14 AM" or "Yesterday" or "Mon, Nov 10"
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

  // Determine thumbnail type matching Image 0
  const isWeekendPlans = titleLower.includes("weekend") || titleLower.includes("plans") || titleLower.includes("museum");
  const isIdeas = titleLower.includes("idea") || titleLower.includes("kova");
  const isPoem = titleLower.includes("poem") || titleLower.includes("poetry") || quoteText !== null;
  const isGrocery = titleLower.includes("grocery") || titleLower.includes("groceries") || titleLower.includes("milk");

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
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
              // Checklists matching Image 0
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
              // Quote preview matching Image 0: italic serif quote
              <p className="text-[13px] italic font-serif text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                "{quoteText}"
              </p>
            ) : (
              // Normal text preview matching Image 0
              <p className="text-[13px] text-[var(--text-muted)] line-clamp-2 leading-normal">
                {plainText || "No additional text"}
              </p>
            )}
          </div>
        </div>

        {/* Date footer matching Image 0 */}
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-muted)]">
          {formattedDate.startsWith("Today") ? (
            <Calendar size={13} className="text-[var(--text-muted)]" />
          ) : (
            <Clock size={13} className="text-[var(--text-muted)]" />
          )}
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Right Column: Pin icon & Visual Thumbnail */}
      <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 pl-1">
        {/* Top: Pin indicator matching Image 0 */}
        <div className="h-5 flex items-center justify-end">
          {note.is_pinned && (
            <Pin
              size={14}
              className="fill-[var(--text-primary)] text-[var(--text-primary)] rotate-45 transform"
            />
          )}
        </div>

        {/* Bottom thumbnail squircle matching Image 0 */}
        <div className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)]/70 shadow-2xs">
          {isWeekendPlans ? (
            // Mountain landscape thumbnail matching Image 0
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full object-cover"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E4DFD8" />
                  <stop offset="100%" stopColor="#D2CAC0" />
                </linearGradient>
                <linearGradient id="mountainDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2A2A28" />
                  <stop offset="100%" stopColor="#141312" />
                </linearGradient>
                <linearGradient id="mountainLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6C6963" />
                  <stop offset="100%" stopColor="#4A4742" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" fill="url(#skyGrad)" />
              {/* Back peak */}
              <polygon points="50,38 75,85 25,85" fill="url(#mountainLight)" />
              {/* Front main peak */}
              <polygon points="50,38 85,90 48,90" fill="url(#mountainDark)" />
              <polygon points="50,38 18,90 48,90" fill="#3D3B37" />
              {/* Subtle snowcap */}
              <polygon points="50,38 56,48 50,46 44,48" fill="#F8F6F2" opacity="0.9" />
            </svg>
          ) : isIdeas ? (
            // Lightbulb icon matching Image 0
            <div className="flex h-full w-full items-center justify-center bg-[#EFECE6] dark:bg-white/10 text-[var(--text-primary)]">
              <Lightbulb size={22} strokeWidth={1.8} />
            </div>
          ) : isPoem ? (
            // Feather quill icon matching Image 0
            <div className="flex h-full w-full items-center justify-center bg-[#EFECE6] dark:bg-white/10 text-[var(--text-primary)]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                <line x1="16" y1="8" x2="2" y2="22" />
                <line x1="17.5" y1="15" x2="9" y2="15" />
              </svg>
            </div>
          ) : isGrocery ? (
            // Shopping cart matching Image 0
            <div className="flex h-full w-full items-center justify-center bg-[#EFECE6] dark:bg-white/10 text-[var(--text-primary)]">
              <ShoppingCart size={21} strokeWidth={1.8} />
            </div>
          ) : (
            // Default note glyph
            <div className="flex h-full w-full items-center justify-center bg-[#EFECE6] dark:bg-white/10 text-[var(--text-muted)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
