import type { JSONContent } from "@tiptap/core";
import type { Note } from "@/types";

export interface NoteIconMeta {
  icon: string;
  categoryName: string;
  accessibleLabel: string;
  taskStats?: { completed: number; total: number };
}

interface ContentSignals {
  hasTaskBlocks: boolean;
  totalTasks: number;
  completedTasks: number;
  hasBlockquotes: boolean;
  hasCodeBlock: boolean;
  hasImage: boolean;
  hasLinks: boolean;
  bodyLower: string;
}

const MAX_BODY_SCAN_CHARS = 280;

function analyzeNoteContent(content?: JSONContent): ContentSignals {
  const signals: ContentSignals = {
    hasTaskBlocks: false,
    totalTasks: 0,
    completedTasks: 0,
    hasBlockquotes: false,
    hasCodeBlock: false,
    hasImage: false,
    hasLinks: false,
    bodyLower: "",
  };

  if (!content) return signals;

  const textChunks: string[] = [];
  let textLen = 0;

  const walk = (node: JSONContent) => {
    switch (node.type) {
      case "taskList":
        signals.hasTaskBlocks = true;
        break;
      case "taskItem":
        signals.hasTaskBlocks = true;
        signals.totalTasks += 1;
        if (node.attrs?.checked === true) {
          signals.completedTasks += 1;
        }
        break;
      case "blockquote":
        signals.hasBlockquotes = true;
        break;
      case "codeBlock":
        signals.hasCodeBlock = true;
        break;
      case "image":
        signals.hasImage = true;
        break;
    }

    if (node.marks && !signals.hasLinks) {
      for (const mark of node.marks) {
        if (mark.type === "link") {
          signals.hasLinks = true;
          break;
        }
      }
    }

    if (node.text && textLen < MAX_BODY_SCAN_CHARS) {
      textChunks.push(node.text);
      textLen += node.text.length + 1;
    }

    if (Array.isArray(node.content)) {
      for (let i = 0; i < node.content.length; i++) {
        walk(node.content[i]);
      }
    }
  };

  walk(content);
  signals.bodyLower = textChunks.join(" ").toLowerCase();
  return signals;
}

function hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
  for (let i = 0; i < keywords.length; i++) {
    if (text.includes(keywords[i])) return true;
  }
  return false;
}

const SHOPPING_KEYWORDS = ["grocer", "shop", "market", "buy", "shopping", "supermarket"] as const;
const TASK_KEYWORDS = ["plan", "roadmap", "todo", "task", "milestone", "checklist", "errand"] as const;
const QUOTE_KEYWORDS = ["poem", "poetry", "quote", "reflection", "verse", "haiku", "lyrics"] as const;
const IDEA_KEYWORDS = ["idea", "concept", "brainstorm", "platform", "startup", "feature", "pitch"] as const;
const CODE_KEYWORDS = [
  "code", "snippet", "api", "bug", "function", "algorithm", "dev",
  "rust", "tauri", "typescript", "python", "sql", "react", "debug",
] as const;
const MEETING_KEYWORDS = ["meeting", "standup", "1:1", "sync up", "agenda", "minutes", "interview", "call notes"] as const;
const RECIPE_KEYWORDS = ["recipe", "ingredients", "cook", "bake", "dinner", "lunch", "breakfast", "meal prep"] as const;
const FITNESS_KEYWORDS = ["workout", "gym", "fitness", "exercise", "run", "training", "health"] as const;
const MUSIC_KEYWORDS = ["music", "playlist", "song", "album", "chord", "guitar", "tracklist"] as const;
const STUDY_KEYWORDS = ["study", "learn", "research", "machine learning", "course", "lecture", "exam", "notes:"] as const;
const BOOK_KEYWORDS = ["book", "reading", "novel", "chapter", "author", "audiobook"] as const;
const JOURNAL_KEYWORDS = ["journal", "diary", "gratitude", "morning pages", "daily log"] as const;
const LATER_KEYWORDS = ["later", "bookmark", "save", "link", "read later", "watch later"] as const;
const TRAVEL_KEYWORDS = ["travel", "trip", "flight", "vacation", "hotel", "itinerary", "packing"] as const;
const FINANCE_KEYWORDS = ["budget", "expense", "finance", "payment", "receipt", "invoice", "tax"] as const;
const DESIGN_KEYWORDS = ["design", "palette", "wireframe", "ui ", "ux ", "figma", "sketch"] as const;

/**
 * Intelligently analyzes note title, collection, and structured block contents
 * in a single AST pass to classify the note and determine its semantic icon.
 */
export function classifyNoteIcon(note: Note, collectionName?: string): NoteIconMeta {
  const titleLower = (note.title || "").toLowerCase();
  const colLower = (collectionName || "").toLowerCase();
  const signals = analyzeNoteContent(note.content);
  const combinedTitleAndBody = `${titleLower} ${signals.bodyLower}`;
  const taskStats =
    signals.totalTasks > 0
      ? { completed: signals.completedTasks, total: signals.totalTasks }
      : undefined;

  // 1. Shopping & Groceries (check before generic tasks so "Groceries" checklist gets cart icon)
  if (hasAnyKeyword(titleLower, SHOPPING_KEYWORDS) || hasAnyKeyword(colLower, SHOPPING_KEYWORDS)) {
    return {
      icon: "shopping_cart",
      categoryName: "Shopping",
      accessibleLabel: "Shopping list note",
      taskStats,
    };
  }

  // 2. Checklists & Tasks
  if (
    signals.hasTaskBlocks ||
    hasAnyKeyword(titleLower, TASK_KEYWORDS) ||
    colLower.includes("task")
  ) {
    return {
      icon: "checklist",
      categoryName: "Tasks",
      accessibleLabel: "Task list note",
      taskStats,
    };
  }

  // 3. Quotes, Poems, and Reflections
  if (signals.hasBlockquotes || hasAnyKeyword(titleLower, QUOTE_KEYWORDS)) {
    return {
      icon: "format_quote",
      categoryName: "Quote / Poem",
      accessibleLabel: "Poem or quote note",
    };
  }

  // 4. Meetings & Calls
  if (hasAnyKeyword(titleLower, MEETING_KEYWORDS) || colLower.includes("meeting")) {
    return {
      icon: "groups",
      categoryName: "Meetings",
      accessibleLabel: "Meeting notes",
    };
  }

  // 5. Ideas & Concepts
  if (hasAnyKeyword(titleLower, IDEA_KEYWORDS) || colLower.includes("idea")) {
    return {
      icon: "lightbulb",
      categoryName: "Ideas",
      accessibleLabel: "Idea note",
    };
  }

  // 6. Code & Technical
  if (signals.hasCodeBlock || hasAnyKeyword(titleLower, CODE_KEYWORDS)) {
    return {
      icon: "code",
      categoryName: "Code",
      accessibleLabel: "Code snippet note",
    };
  }

  // 7. Recipes & Food
  if (hasAnyKeyword(combinedTitleAndBody, RECIPE_KEYWORDS) || colLower.includes("recipe")) {
    return {
      icon: "restaurant",
      categoryName: "Recipes",
      accessibleLabel: "Recipe note",
    };
  }

  // 8. Health & Fitness
  if (hasAnyKeyword(titleLower, FITNESS_KEYWORDS) || colLower.includes("fitness") || colLower.includes("health")) {
    return {
      icon: "fitness_center",
      categoryName: "Fitness",
      accessibleLabel: "Fitness and health note",
    };
  }

  // 9. Music & Audio
  if (hasAnyKeyword(titleLower, MUSIC_KEYWORDS) || colLower.includes("music")) {
    return {
      icon: "music_note",
      categoryName: "Music",
      accessibleLabel: "Music note",
    };
  }

  // 10. Study, Research & Learning
  if (
    hasAnyKeyword(titleLower, STUDY_KEYWORDS) ||
    titleLower.includes(" ai") ||
    titleLower.startsWith("ai ") ||
    colLower.includes("learning") ||
    colLower.includes("study")
  ) {
    return {
      icon: "school",
      categoryName: "Study",
      accessibleLabel: "Study and learning note",
    };
  }

  // 11. Books & Reading
  if (hasAnyKeyword(titleLower, BOOK_KEYWORDS)) {
    return {
      icon: "menu_book",
      categoryName: "Reading",
      accessibleLabel: "Book and reading note",
    };
  }

  // 12. Journal & Diary
  if (hasAnyKeyword(titleLower, JOURNAL_KEYWORDS) || colLower.includes("journal")) {
    return {
      icon: "auto_stories",
      categoryName: "Journal",
      accessibleLabel: "Journal note",
    };
  }

  // 13. Save For Later & Bookmarks
  if (hasAnyKeyword(titleLower, LATER_KEYWORDS) || colLower.includes("later")) {
    return {
      icon: "bookmark",
      categoryName: "Saved",
      accessibleLabel: "Saved for later note",
    };
  }

  // 14. Travel & Destinations
  if (hasAnyKeyword(combinedTitleAndBody, TRAVEL_KEYWORDS) || colLower.includes("travel")) {
    return {
      icon: "flight",
      categoryName: "Travel",
      accessibleLabel: "Travel note",
    };
  }

  // 15. Finances & Receipts
  if (hasAnyKeyword(titleLower, FINANCE_KEYWORDS) || colLower.includes("finance")) {
    return {
      icon: "payments",
      categoryName: "Finance",
      accessibleLabel: "Finance note",
    };
  }

  // 16. Design & Visuals
  if (hasAnyKeyword(titleLower, DESIGN_KEYWORDS) || signals.hasImage) {
    return {
      icon: signals.hasImage ? "image" : "palette",
      categoryName: signals.hasImage ? "Media" : "Design",
      accessibleLabel: "Visual or design note",
    };
  }

  // 17. Fallback: if body has links, classify as Saved/Bookmark
  if (signals.hasLinks) {
    return {
      icon: "bookmark",
      categoryName: "Links",
      accessibleLabel: "Saved links note",
    };
  }

  return { icon: "description", categoryName: "Document", accessibleLabel: "Document note" };
}
