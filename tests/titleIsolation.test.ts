import { describe, it, expect, beforeEach } from "vitest";
import { NoteService } from "@/services/noteService";
import { getStorageAdapter } from "@/lib/storage";

describe("Note Title Isolation", () => {
  let noteService: NoteService;

  beforeEach(async () => {
    const storage = await getStorageAdapter();
    await storage.clearAllData();
    noteService = new NoteService();
  });

  it("updates only the specified target note title and does not clobber other notes", async () => {
    const noteA = await noteService.createNote(null, "First Note Title");
    const noteB = await noteService.createNote(null, "Second Note Title");

    expect(noteA.title).toBe("First Note Title");
    expect(noteB.title).toBe("Second Note Title");

    // Update note A
    const updatedA = await noteService.updateNote(noteA.id, {
      title: "Open. Write. Everything takes care of itself.",
    });

    expect(updatedA?.title).toBe("Open. Write. Everything takes care of itself.");

    // Retrieve note B and ensure it was NOT affected
    const freshB = await noteService.getNoteById(noteB.id);
    expect(freshB?.title).toBe("Second Note Title");
  });

  it("preserves explicit titles when content contains different text", async () => {
    const note = await noteService.createNote(null, "My Custom Title");
    const updated = await noteService.updateNote(note.id, {
      title: "My Custom Title",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Some random first line that is different." }],
          },
        ],
      },
    });

    expect(updated?.title).toBe("My Custom Title");
  });
});
