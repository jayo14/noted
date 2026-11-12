import type { Note, NoteId, CollectionId, UserId } from "@/types";
import { getStorageAdapter } from "@/lib/storage";
import { createEmptyDoc, generateUUID, nowISO } from "@/lib/utils";

const DEFAULT_USER_ID: UserId = "local-user";

export class NoteService {
  private static instance: NoteService;

  public static getInstance(): NoteService {
    if (!NoteService.instance) {
      NoteService.instance = new NoteService();
    }
    return NoteService.instance;
  }

  public async getAllNotes(includeDeleted = false): Promise<Note[]> {
    const storage = await getStorageAdapter();
    return await storage.getNotes(includeDeleted);
  }

  public async getNoteById(id: NoteId): Promise<Note | null> {
    const storage = await getStorageAdapter();
    return await storage.getNoteById(id);
  }

  public async createNote(collectionId: CollectionId | null = null, title = "Untitled"): Promise<Note> {
    const storage = await getStorageAdapter();
    const now = nowISO();
    const newNote: Note = {
      id: generateUUID(),
      user_id: DEFAULT_USER_ID,
      title,
      content: createEmptyDoc(),
      collection_id: collectionId,
      is_pinned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      revision: 1,
    };

    await storage.saveNote(newNote);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: newNote.id,
      operation: "insert",
      payload: newNote as unknown as Record<string, unknown>,
    });

    return newNote;
  }

  public async updateNote(
    id: NoteId,
    updates: Partial<Omit<Note, "id" | "user_id" | "created_at">>,
  ): Promise<Note | null> {
    const storage = await getStorageAdapter();
    const existing = await storage.getNoteById(id);
    if (!existing) return null;

    const updatedNote: Note = {
      ...existing,
      ...updates,
      updated_at: nowISO(),
      revision: (existing.revision || 1) + 1,
    };

    await storage.saveNote(updatedNote);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: updatedNote.id,
      operation: "update",
      payload: updatedNote as unknown as Record<string, unknown>,
    });

    return updatedNote;
  }

  public async togglePin(id: NoteId): Promise<Note | null> {
    const storage = await getStorageAdapter();
    const note = await storage.getNoteById(id);
    if (!note) return null;

    return await this.updateNote(id, { is_pinned: !note.is_pinned });
  }

  public async moveToCollection(noteId: NoteId, collectionId: CollectionId | null): Promise<Note | null> {
    return await this.updateNote(noteId, { collection_id: collectionId });
  }

  public async softDeleteNote(id: NoteId): Promise<void> {
    const storage = await getStorageAdapter();
    const note = await storage.getNoteById(id);
    if (!note) return;

    const now = nowISO();
    note.deleted_at = now;
    note.updated_at = now;
    note.revision = (note.revision || 1) + 1;

    await storage.saveNote(note);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: id,
      operation: "delete",
      payload: { id, deleted_at: now },
    });
  }

  public async restoreNote(id: NoteId): Promise<Note | null> {
    const storage = await getStorageAdapter();
    const note = await storage.getNoteById(id);
    if (!note) return null;

    const now = nowISO();
    note.deleted_at = null;
    note.updated_at = now;
    note.revision = (note.revision || 1) + 1;

    await storage.saveNote(note);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: id,
      operation: "update",
      payload: note as unknown as Record<string, unknown>,
    });

    return note;
  }

  public async hardDeleteNote(id: NoteId): Promise<void> {
    const storage = await getStorageAdapter();
    await storage.deleteNote(id, true);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: id,
      operation: "delete",
      payload: { id, hard: true },
    });
  }

  public async duplicateNote(id: NoteId): Promise<Note | null> {
    const existing = await this.getNoteById(id);
    if (!existing) return null;

    const storage = await getStorageAdapter();
    const now = nowISO();
    const duplicate: Note = {
      id: generateUUID(),
      user_id: existing.user_id,
      title: `${existing.title} (Copy)`,
      content: JSON.parse(JSON.stringify(existing.content)),
      collection_id: existing.collection_id,
      is_pinned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      revision: 1,
    };

    await storage.saveNote(duplicate);
    await storage.enqueueSync({
      entity_type: "note",
      entity_id: duplicate.id,
      operation: "insert",
      payload: duplicate as unknown as Record<string, unknown>,
    });

    return duplicate;
  }

  public async emptyTrash(): Promise<void> {
    const storage = await getStorageAdapter();
    const allNotes = await storage.getNotes(true);
    const trash = allNotes.filter((n) => n.deleted_at !== null);

    for (const note of trash) {
      await this.hardDeleteNote(note.id);
    }
  }
}

export const noteService = NoteService.getInstance();
