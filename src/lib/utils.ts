import type { JSONContent } from "@tiptap/core";
import type { NoteStats } from "@/types";

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function extractTextFromJSONContent(content: JSONContent): string {
  if (!content) return "";
  let text = "";

  if (content.text) {
    text += content.text;
  }

  if (content.content && Array.isArray(content.content)) {
    for (const child of content.content) {
      const childText = extractTextFromJSONContent(child);
      if (childText) {
        text += (text.length > 0 && !text.endsWith("\n") ? "\n" : "") + childText;
      }
    }
  }

  return text;
}

export function extractTitleAndPreview(content: JSONContent, fallbackTitle = "Untitled"): { title: string; preview: string } {
  const fullText = extractTextFromJSONContent(content).trim();
  if (!fullText) {
    return { title: fallbackTitle, preview: "" };
  }

  const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { title: fallbackTitle, preview: "" };
  }

  const rawTitle = lines[0].replace(/^#+\s*/, "").slice(0, 80);
  const title = rawTitle.length > 0 ? rawTitle : fallbackTitle;
  const preview = lines.slice(1).join(" ").slice(0, 160);

  return { title, preview };
}

export function calculateNoteStats(content: JSONContent): NoteStats {
  const text = extractTextFromJSONContent(content).trim();
  if (!text) {
    return { words: 0, characters: 0, readingTimeMinutes: 0 };
  }

  const characters = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  // Average reading speed: 200 words per minute
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return { words, characters, readingTimeMinutes };
}

export function createEmptyDoc(initialHeading?: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: initialHeading
          ? [
              {
                type: "text",
                text: initialHeading,
              },
            ]
          : [],
      },
    ],
  };
}
