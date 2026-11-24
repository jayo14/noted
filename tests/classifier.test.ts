import { describe, it, expect } from "vitest";
import { classifyNoteIcon } from "@/lib/noteClassifier";
import type { Note } from "@/types";

describe("Intelligent Note Icon Classifier", () => {
  it("classifies task checklists correctly", () => {
    const note: Note = {
      id: "1",
      user_id: "user1",
      collection_id: null,
      title: "Weekend plans",
      content: {
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [{ type: "taskItem", attrs: { checked: false }, content: [] }],
          },
        ],
      },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("checklist");
  });

  it("classifies grocery shopping correctly", () => {
    const note: Note = {
      id: "2",
      user_id: "user1",
      collection_id: null,
      title: "Groceries",
      content: { type: "doc", content: [] },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("shopping_cart");
  });

  it("classifies poems and quotes correctly", () => {
    const note: Note = {
      id: "3",
      user_id: "user1",
      collection_id: null,
      title: "A little poem",
      content: {
        type: "doc",
        content: [{ type: "blockquote", content: [] }],
      },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("format_quote");
  });

  it("classifies ideas correctly", () => {
    const note: Note = {
      id: "4",
      user_id: "user1",
      collection_id: null,
      title: "Project ideas",
      content: { type: "doc", content: [] },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("lightbulb");
  });

  it("classifies saved later items correctly", () => {
    const note: Note = {
      id: "5",
      user_id: "user1",
      collection_id: null,
      title: "Later",
      content: { type: "doc", content: [] },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("bookmark");
  });

  it("tracks completed and total task stats for checklist notes", () => {
    const note: Note = {
      id: "6",
      user_id: "user1",
      collection_id: null,
      title: "Sprint checklist",
      content: {
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [
              { type: "taskItem", attrs: { checked: true }, content: [] },
              { type: "taskItem", attrs: { checked: false }, content: [] },
              { type: "taskItem", attrs: { checked: true }, content: [] },
            ],
          },
        ],
      },
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const result = classifyNoteIcon(note);
    expect(result.icon).toBe("checklist");
    expect(result.taskStats).toEqual({ completed: 2, total: 3 });
  });

  it("classifies meetings, recipes, fitness, and code notes smartly", () => {
    const base: Omit<Note, "id" | "title" | "content"> = {
      user_id: "user1",
      collection_id: null,
      is_pinned: false,
      revision: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    expect(classifyNoteIcon({ ...base, id: "m1", title: "Weekly Standup", content: { type: "doc", content: [] } }).icon).toBe("groups");
    expect(classifyNoteIcon({ ...base, id: "r1", title: "Untitled", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Ingredients: flour and eggs" }] }] } }).icon).toBe("restaurant");
    expect(classifyNoteIcon({ ...base, id: "f1", title: "Gym Workout", content: { type: "doc", content: [] } }).icon).toBe("fitness_center");
    expect(classifyNoteIcon({ ...base, id: "c1", title: "Untitled", content: { type: "doc", content: [{ type: "codeBlock", content: [] }] } }).icon).toBe("code");
  });
});
