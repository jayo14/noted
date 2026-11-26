import { describe, it, expect, beforeEach } from "vitest";
import { hiddenNotesService } from "@/services/hiddenNotesService";
import { noteService } from "@/services/noteService";
import { SearchService } from "@/services/searchService";

describe("HiddenNotesService & Hidden Notes Filtering", () => {
  beforeEach(async () => {
    // Reset PIN if previously configured
    if (await hiddenNotesService.hasPinConfigured()) {
      await hiddenNotesService.clearPin("1234");
      await hiddenNotesService.clearPin("5678");
    }
  });

  it("validates 4-digit PIN format strictly", () => {
    expect(hiddenNotesService.isValidPin("1234")).toBe(true);
    expect(hiddenNotesService.isValidPin("0000")).toBe(true);
    expect(hiddenNotesService.isValidPin("123")).toBe(false);
    expect(hiddenNotesService.isValidPin("12345")).toBe(false);
    expect(hiddenNotesService.isValidPin("abcd")).toBe(false);
  });

  it("sets up, verifies, and changes a 4-digit PIN", async () => {
    expect(await hiddenNotesService.hasPinConfigured()).toBe(false);

    await hiddenNotesService.setupPin("1234");
    expect(await hiddenNotesService.hasPinConfigured()).toBe(true);
    expect(await hiddenNotesService.verifyPin("1234")).toBe(true);
    expect(await hiddenNotesService.verifyPin("9999")).toBe(false);

    const badChange = await hiddenNotesService.changePin("0000", "5678");
    expect(badChange).toBe(false);

    const okChange = await hiddenNotesService.changePin("1234", "5678");
    expect(okChange).toBe(true);
    expect(await hiddenNotesService.verifyPin("1234")).toBe(false);
    expect(await hiddenNotesService.verifyPin("5678")).toBe(true);
  });

  it("excludes hidden notes from normal SearchService sections and exposes them in hidden section", async () => {
    const visibleNote = await noteService.createNote(null, "Public Note");
    const secretNote = await noteService.createNote(null, "Secret Note");
    await noteService.setHidden(secretNote.id, true);

    const all = await noteService.getAllNotes(true);
    const searchService = SearchService.getInstance();

    const normalResults = searchService.filterNotes(all, {
      section: "all",
      collectionId: null,
      searchQuery: "",
    });
    expect(normalResults.some((r) => r.note.id === visibleNote.id)).toBe(true);
    expect(normalResults.some((r) => r.note.id === secretNote.id)).toBe(false);

    const hiddenResults = searchService.filterNotes(all, {
      section: "hidden",
      collectionId: null,
      searchQuery: "",
    });
    expect(hiddenResults.some((r) => r.note.id === secretNote.id)).toBe(true);
    expect(hiddenResults.some((r) => r.note.id === visibleNote.id)).toBe(false);
  });
});
