import type { JSONContent } from "@tiptap/core";
import type { Note } from "@/types";
import { extractTextFromJSONContent } from "./utils";

export interface NoteIconMeta {
  icon: string;
  categoryName: string;
  accessibleLabel: string;
}

/**
 * Intelligently analyzes note title, collections, and structured block contents
 * to classify the note and determine the most appropriate semantic icon.
 */
export function classifyNoteIcon(note: Note, collectionName?: string): NoteIconMeta {
  const titleLower = (note.title || "").toLowerCase();
  const colLower = (collectionName || "").toLowerCase();
  const rawContent = JSON.stringify(note.content || {});

  // 1. Checklists & Tasks
  const hasTaskBlocks = rawContent.includes('"type":"taskList"') || rawContent.includes('"type":"taskItem"');
  if (
    hasTaskBlocks ||
    titleLower.includes("plan") ||
    titleLower.includes("roadmap") ||
    titleLower.includes("todo") ||
    titleLower.includes("task") ||
    titleLower.includes("milestone") ||
    colLower.includes("task")
  ) {
    if (titleLower.includes("grocery") || titleLower.includes("shop") || titleLower.includes("market") || titleLower.includes("buy")) {
      return { icon: "shopping_cart", categoryName: "Shopping", accessibleLabel: "Shopping list note" };
    }
    return { icon: "checklist", categoryName: "Tasks", accessibleLabel: "Task list note" };
  }

  // 2. Shopping & Groceries
  if (titleLower.includes("grocer") || titleLower.includes("shop") || titleLower.includes("market") || titleLower.includes("buy")) {
    return { icon: "shopping_cart", categoryName: "Shopping", accessibleLabel: "Shopping list note" };
  }

  // 3. Quotes, Poems, and Reflections
  const hasBlockquotes = rawContent.includes('"type":"blockquote"');
  if (
    hasBlockquotes ||
    titleLower.includes("poem") ||
    titleLower.includes("poetry") ||
    titleLower.includes("quote") ||
    titleLower.includes("reflection") ||
    titleLower.includes("verse") ||
    titleLower.includes("haiku")
  ) {
    return { icon: "format_quote", categoryName: "Quote / Poem", accessibleLabel: "Poem or quote note" };
  }

  // 4. Ideas & Concepts
  if (
    titleLower.includes("idea") ||
    titleLower.includes("concept") ||
    titleLower.includes("brainstorm") ||
    titleLower.includes("platform") ||
    titleLower.includes("startup") ||
    titleLower.includes("feature") ||
    colLower.includes("idea")
  ) {
    return { icon: "lightbulb", categoryName: "Ideas", accessibleLabel: "Idea note" };
  }

  // 5. Code & Technical
  const hasCodeBlock = rawContent.includes('"type":"codeBlock"');
  if (
    hasCodeBlock ||
    titleLower.includes("code") ||
    titleLower.includes("snippet") ||
    titleLower.includes("api") ||
    titleLower.includes("bug") ||
    titleLower.includes("function") ||
    titleLower.includes("algorithm") ||
    titleLower.includes("dev") ||
    titleLower.includes("rust") ||
    titleLower.includes("tauri") ||
    titleLower.includes("typescript") ||
    titleLower.includes("python")
  ) {
    return { icon: "code", categoryName: "Code", accessibleLabel: "Code snippet note" };
  }

  // 6. Study, Research & Learning
  if (
    titleLower.includes("study") ||
    titleLower.includes("learn") ||
    titleLower.includes("research") ||
    titleLower.includes("machine learning") ||
    titleLower.includes("ai") ||
    titleLower.includes("course") ||
    titleLower.includes("lecture") ||
    colLower.includes("learning") ||
    colLower.includes("study")
  ) {
    return { icon: "school", categoryName: "Study", accessibleLabel: "Study and learning note" };
  }

  // 7. Books & Reading
  if (
    titleLower.includes("book") ||
    titleLower.includes("reading") ||
    titleLower.includes("novel") ||
    titleLower.includes("chapter") ||
    titleLower.includes("author")
  ) {
    return { icon: "menu_book", categoryName: "Reading", accessibleLabel: "Book and reading note" };
  }

  // 8. Save For Later & Bookmarks
  if (
    titleLower.includes("later") ||
    titleLower.includes("bookmark") ||
    titleLower.includes("save") ||
    titleLower.includes("link") ||
    titleLower.includes("read later") ||
    colLower.includes("later")
  ) {
    return { icon: "bookmark", categoryName: "Saved", accessibleLabel: "Saved for later note" };
  }

  // 9. Travel & Destinations
  if (
    titleLower.includes("travel") ||
    titleLower.includes("trip") ||
    titleLower.includes("flight") ||
    titleLower.includes("vacation") ||
    titleLower.includes("hotel") ||
    colLower.includes("travel")
  ) {
    return { icon: "flight", categoryName: "Travel", accessibleLabel: "Travel note" };
  }

  // 10. Finances & Receipts
  if (
    titleLower.includes("budget") ||
    titleLower.includes("expense") ||
    titleLower.includes("finance") ||
    titleLower.includes("payment") ||
    titleLower.includes("receipt")
  ) {
    return { icon: "payments", categoryName: "Finance", accessibleLabel: "Finance note" };
  }

  return { icon: "description", categoryName: "Document", accessibleLabel: "Document note" };
}
