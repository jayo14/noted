import { describe, it, expect } from "vitest";
import {
  formatNoteDateLabel,
  getSectionHeaderForDate,
  groupNotesByDate,
  extractNoteSnippet,
} from "@/lib/dateGrouping";
import type { Note } from "@/types";

describe("Date Grouping & Formatting for Mobile List", () => {
  const baseNow = new Date("2026-11-20T12:00:00Z");

  describe("formatNoteDateLabel", () => {
    it("formats today as Today", () => {
      const todayIso = new Date().toISOString();
      expect(formatNoteDateLabel(todayIso)).toBe("Today");
    });

    it("formats yesterday as Yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatNoteDateLabel(yesterday.toISOString())).toBe("Yesterday");
    });

    it("formats past dates as DD/MM/YYYY", () => {
      expect(formatNoteDateLabel("2026-11-17T10:00:00Z")).toContain("2026");
      expect(formatNoteDateLabel("2026-11-17T10:00:00Z")).toContain("17");
    });
  });

  describe("getSectionHeaderForDate", () => {
    it("identifies Today and Yesterday correctly", () => {
      const today = new Date(baseNow);
      expect(getSectionHeaderForDate(today, baseNow)).toBe("Today");

      const yesterday = new Date(baseNow);
      yesterday.setDate(baseNow.getDate() - 1);
      expect(getSectionHeaderForDate(yesterday, baseNow)).toBe("Yesterday");
    });

    it("identifies current year months by month name", () => {
      const pastDate = new Date("2026-11-05T12:00:00Z");
      expect(getSectionHeaderForDate(pastDate, baseNow)).toBe("November");
    });

    it("includes year for previous years", () => {
      const lastYear = new Date("2025-08-15T12:00:00Z");
      expect(getSectionHeaderForDate(lastYear, baseNow)).toBe("August 2025");
    });
  });

  describe("groupNotesByDate", () => {
    it("groups notes into chronological sections", () => {
      const notes: Note[] = [
        {
          id: "1",
          user_id: "u1",
          title: "Today note",
          content: null,
          collection_id: null,
          is_pinned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          local_revision: 1,
          sync_revision: 1,
        },
        {
          id: "2",
          user_id: "u1",
          title: "Past note",
          content: null,
          collection_id: null,
          is_pinned: false,
          created_at: "2025-05-10T12:00:00Z",
          updated_at: "2025-05-10T12:00:00Z",
          deleted_at: null,
          local_revision: 1,
          sync_revision: 1,
        },
      ];

      const groups = groupNotesByDate(notes);
      expect(groups.length).toBe(2);
      expect(groups[0].title).toBe("Today");
      expect(groups[0].notes[0].id).toBe("1");
      expect(groups[1].title).toBe("May 2025");
      expect(groups[1].notes[0].id).toBe("2");
    });
  });

  describe("extractNoteSnippet", () => {
    it("extracts body text distinct from title", () => {
      const note: Note = {
        id: "1",
        user_id: "u1",
        title: "Academic GEM",
        content: {
          type: "doc",
          content: [
            { type: "heading", content: [{ type: "text", text: "Academic GEM" }] },
            { type: "paragraph", content: [{ type: "text", text: "No One Succeed Alone" }] },
          ],
        },
        collection_id: null,
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        local_revision: 1,
        sync_revision: 1,
      };

      expect(extractNoteSnippet(note)).toBe("No One Succeed Alone");
    });
  });
});
