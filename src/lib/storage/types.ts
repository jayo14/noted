import type { Note, Collection, SyncQueueItem, SyncStatus } from "@/types";

export interface DatabaseAdapter {
  init(): Promise<void>;
  getNotes(includeDeleted?: boolean): Promise<Note[]>;
  getNoteById(id: string): Promise<Note | null>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string, hard?: boolean): Promise<void>;
  getCollections(): Promise<Collection[]>;
  saveCollection(collection: Collection): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  enqueueSync(item: Omit<SyncQueueItem, "id" | "created_at" | "status" | "retries">): Promise<SyncQueueItem>;
  getPendingSyncQueue(): Promise<SyncQueueItem[]>;
  updateSyncQueueItem(id: string, status: SyncStatus, error?: string): Promise<void>;
  removeSyncQueueItem(id: string): Promise<void>;
  getSetting<T>(key: string, defaultValue: T): Promise<T>;
  setSetting<T>(key: string, value: T): Promise<void>;
  clearAllData(): Promise<void>;
}
