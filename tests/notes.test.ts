import { describe, it, expect, beforeEach } from "vitest";
import { noteService } from "../src/services/noteService";
import { collectionService } from "../src/services/collectionService";
import { getStorageAdapter } from "../src/lib/storage";

describe("NoteService & CollectionService Operations", () => {
  beforeEach(async () => {
    const storage = await getStorageAdapter();
    await storage.clearAllData();
  });

  it("creates a new note with default empty doc and revision 1", async () => {
    const note = await noteService.createNote(null, "My First Note");
    expect(note.id).toBeDefined();
    expect(note.title).toBe("My First Note");
    expect(note.revision).toBe(1);
    expect(note.deleted_at).toBeNull();
    expect(note.is_pinned).toBe(false);

    const retrieved = await noteService.getNoteById(note.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe("My First Note");
  });

  it("updates note title and content and increments revision number", async () => {
    const note = await noteService.createNote(null, "Initial Title");
    expect(note.revision).toBe(1);

    const updated = await noteService.updateNote(note.id, {
      title: "Updated Title",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "New content text" }] }],
      },
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Updated Title");
    expect(updated?.revision).toBe(2);
  });

  it("toggles note pin status accurately", async () => {
    const note = await noteService.createNote(null, "Pin Test");
    expect(note.is_pinned).toBe(false);

    const pinned = await noteService.togglePin(note.id);
    expect(pinned?.is_pinned).toBe(true);

    const unpinned = await noteService.togglePin(note.id);
    expect(unpinned?.is_pinned).toBe(false);
  });

  it("performs soft deletion and restore without losing note data", async () => {
    const note = await noteService.createNote(null, "Soft Delete Test");
    await noteService.softDeleteNote(note.id);

    const activeNotes = await noteService.getAllNotes(false);
    expect(activeNotes.find((n) => n.id === note.id)).toBeUndefined();

    const allNotes = await noteService.getAllNotes(true);
    const deletedNote = allNotes.find((n) => n.id === note.id);
    expect(deletedNote).toBeDefined();
    expect(deletedNote?.deleted_at).not.toBeNull();

    const restored = await noteService.restoreNote(note.id);
    expect(restored?.deleted_at).toBeNull();

    const activeAfterRestore = await noteService.getAllNotes(false);
    expect(activeAfterRestore.find((n) => n.id === note.id)).toBeDefined();
  });

  it("duplicates an existing note with '(Copy)' suffix and fresh ID", async () => {
    const note = await noteService.createNote(null, "Original Idea");
    const duplicate = await noteService.duplicateNote(note.id);

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).not.toBe(note.id);
    expect(duplicate?.title).toBe("Original Idea (Copy)");
    expect(duplicate?.revision).toBe(1);
    expect(duplicate?.is_pinned).toBe(false);
  });

  it("manages collections and moving notes between collections", async () => {
    const col = await collectionService.createCollection("Work Projects");
    expect(col.name).toBe("Work Projects");

    const note = await noteService.createNote(col.id, "Project Spec");
    expect(note.collection_id).toBe(col.id);

    // Move to null (no collection)
    const moved = await noteService.moveToCollection(note.id, null);
    expect(moved?.collection_id).toBeNull();

    // Rename collection
    const renamed = await collectionService.renameCollection(col.id, "Work & Architecture");
    expect(renamed?.name).toBe("Work & Architecture");

    // Delete collection
    await collectionService.deleteCollection(col.id);
    const collections = await collectionService.getCollections();
    expect(collections.find((c) => c.id === col.id)).toBeUndefined();
  });
});
