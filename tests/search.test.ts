import { describe, it, expect } from "vitest";
import { searchService } from "../src/services/searchService";
import type { Note } from "../src/types";

describe("SearchService", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      user_id: "user-1",
      title: "Meeting Notes",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Discussed the new product architecture and SQLite local sync." }],
          },
        ],
      },
      collection_id: "col-work",
      is_pinned: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T12:00:00.000Z",
      deleted_at: null,
      revision: 1,
    },
    {
      id: "note-2",
      user_id: "user-1",
      title: "Grocery Checklist",
      content: {
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: true },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Oat milk" }] }],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Espresso beans" }] }],
              },
            ],
          },
        ],
      },
      collection_id: "col-personal",
      is_pinned: false,
      created_at: "2026-11-02T10:00:00.000Z",
      updated_at: "2026-11-02T15:00:00.000Z",
      deleted_at: null,
      revision: 1,
    },
    {
      id: "note-3",
      user_id: "user-1",
      title: "Archived Draft",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "This note was moved to trash." }],
          },
        ],
      },
      collection_id: null,
      is_pinned: false,
      created_at: "2026-10-20T10:00:00.000Z",
      updated_at: "2026-10-25T10:00:00.000Z",
      deleted_at: "2026-10-25T10:05:00.000Z",
      revision: 2,
    },
  ];

  it("returns active notes sorted by pinned and updated_at when query is empty", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "all",
      collectionId: null,
      searchQuery: "",
    });

    expect(results.length).toBe(2);
    // Pinned note comes first
    expect(results[0].note.id).toBe("note-1");
    expect(results[1].note.id).toBe("note-2");
  });

  it("matches search words in note title", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "all",
      collectionId: null,
      searchQuery: "Meeting",
    });

    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe("note-1");
  });

  it("matches search words in deep structured content body", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "all",
      collectionId: null,
      searchQuery: "Espresso",
    });

    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe("note-2");
    expect(results[0].snippet).toContain("Espresso beans");
  });

  it("filters notes by collection", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "collection",
      collectionId: "col-work",
      searchQuery: "",
    });

    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe("note-1");
  });

  it("returns only deleted notes in trash section", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "trash",
      collectionId: null,
      searchQuery: "",
    });

    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe("note-3");
  });

  it("filters notes containing task lists when onlyChecklists is enabled", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "all",
      collectionId: null,
      searchQuery: "",
      onlyChecklists: true,
    });

    expect(results.length).toBe(1);
    expect(results[0].note.title).toBe("Grocery Checklist");
  });

  it("sorts notes alphabetically by title when sortBy is 'title'", () => {
    const results = searchService.filterNotes(mockNotes, {
      section: "all",
      collectionId: null,
      searchQuery: "",
      sortBy: "title",
    });

    // Pinned note still gets priority, but unpinned are sorted
    expect(results[0].note.id).toBe("note-1"); // pinned
    expect(results[1].note.title).toBe("Grocery Checklist");
  });
});
