import type { Note } from "@/types";
import { extractTextFromJSONContent } from "./utils";

export interface NoteGroup {
  title: string;
  notes: Note[];
}

export interface NotePreviewData {
  title: string;
  dateLabel: string;
  snippet: string;
  collectionName: string;
}

/**
 * Returns a human-friendly relative date label for iOS-style lists
 * e.g., "Yesterday", "Today", or "19/11/2026"
 */
export function formatNoteDateLabel(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  // If within the current year, format as DD/MM/YYYY or D/M/YYYY
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Determines the section header title for a note based on its update date
 * e.g., "Today", "Yesterday", "November", "October", "2025"
 */
export function getSectionHeaderForDate(date: Date, now = new Date()): string {
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const monthName = date.toLocaleDateString("en-US", { month: "long" });

  if (isCurrentYear) {
    return monthName;
  }

  return `${monthName} ${date.getFullYear()}`;
}

/**
 * Groups a list of notes chronologically by section header
 * (e.g. Today, Yesterday, November, etc.)
 */
export function groupNotesByDate(notes: Note[]): NoteGroup[] {
  if (!notes || notes.length === 0) return [];

  // Sort notes newest updated first
  const sorted = [...notes].sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const now = new Date();
  const groupsMap = new Map<string, Note[]>();

  for (const note of sorted) {
    const date = new Date(note.updated_at || note.created_at || now);
    const header = getSectionHeaderForDate(date, now);

    const existing = groupsMap.get(header);
    if (existing) {
      existing.push(note);
    } else {
      groupsMap.set(header, [note]);
    }
  }

  return Array.from(groupsMap.entries()).map(([title, groupNotes]) => ({
    title,
    notes: groupNotes,
  }));
}

/**
 * Extracts snippet text from note content excluding the title
 */
export function extractNoteSnippet(note: Note): string {
  const title = (note.title || "").trim();
  const content = note.content;
  if (!content || !Array.isArray(content.content)) return "";

  for (const node of content.content) {
    const text = extractTextFromJSONContent(node).trim();
    if (text && text !== title) {
      return text;
    }
  }

  return "";
}
