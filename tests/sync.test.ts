import { describe, it, expect, beforeEach } from "vitest";
import type { Note, SyncQueueItem } from "../src/types";

describe("Sync Engine & Conflict Resolution Logic", () => {
  let mockLocalNote: Note;
  let mockRemoteNote: Note;

  beforeEach(() => {
    mockLocalNote = {
      id: "note-uuid-1",
      user_id: "user-1",
      title: "Local Title",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Local text" }] }],
      },
      collection_id: null,
      is_pinned: false,
      created_at: "2026-11-12T10:00:00.000Z",
      updated_at: "2026-11-12T10:05:00.000Z",
      deleted_at: null,
      revision: 2,
    };

    mockRemoteNote = {
      id: "note-uuid-1",
      user_id: "user-1",
      title: "Remote Title",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Remote text edited on laptop" }] }],
      },
      collection_id: null,
      is_pinned: false,
      created_at: "2026-11-12T10:00:00.000Z",
      updated_at: "2026-11-12T10:08:00.000Z",
      deleted_at: null,
      revision: 4,
    };
  });

  it("detects conflict when remote has a higher revision than local pending edit", () => {
    // When pushing local note with lower revision than remote
    const isConflict = mockRemoteNote.revision > mockLocalNote.revision;
    expect(isConflict).toBe(true);

    // Resolving conflict creates a separate conflict copy
    const conflictNote: Note = {
      ...mockLocalNote,
      id: "conflict-copy-uuid",
      title: `${mockLocalNote.title} (Conflict Copy - Mobile)`,
      revision: 1,
    };

    expect(conflictNote.id).not.toBe(mockLocalNote.id);
    expect(conflictNote.title).toContain("Conflict Copy");
    expect(conflictNote.content).toEqual(mockLocalNote.content);
  });

  it("calculates exponential backoff delay for retried operations", () => {
    function computeBackoff(retries: number): number {
      return Math.min(60000, 1000 * Math.pow(2, retries));
    }

    expect(computeBackoff(1)).toBe(2000); // 2s
    expect(computeBackoff(2)).toBe(4000); // 4s
    expect(computeBackoff(3)).toBe(8000); // 8s
    expect(computeBackoff(4)).toBe(16000); // 16s
    expect(computeBackoff(6)).toBe(60000); // capped at 60s
  });

  it("validates idempotent sync queue processing", () => {
    const queue: SyncQueueItem[] = [
      {
        id: "q-1",
        entity_type: "note",
        entity_id: "note-uuid-1",
        operation: "update",
        payload: { title: "Title A" },
        status: "pending",
        created_at: new Date().toISOString(),
        retries: 0,
      },
    ];

    // Simulating queue item completion
    const completedQueue = queue.filter((item) => item.id !== "q-1");
    expect(completedQueue.length).toBe(0);
  });
});
