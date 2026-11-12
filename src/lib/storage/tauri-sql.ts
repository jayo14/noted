import type { Note, Collection, SyncQueueItem, SyncStatus } from "@/types";
import type { DatabaseAdapter } from "./types";
import { generateUUID, nowISO } from "@/lib/utils";
import Database from "@tauri-apps/plugin-sql";

export class TauriSqlAdapter implements DatabaseAdapter {
  private db: Database | null = null;
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    try {
      this.db = await Database.load("sqlite:noted.db");

      // Execute migrations and table creations
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          collection_id TEXT,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          revision INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notes_collection_id ON notes(collection_id);
        CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);

        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          retries INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          device_name TEXT NOT NULL,
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to initialize Tauri SQLite Database:", e);
      throw e;
    }
  }

  public async getNotes(includeDeleted = false): Promise<Note[]> {
    await this.init();
    if (!this.db) return [];

    const query = includeDeleted
      ? "SELECT * FROM notes ORDER BY updated_at DESC"
      : "SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC";

    const rows = await this.db.select<Array<{
      id: string;
      user_id: string;
      title: string;
      content: string;
      collection_id: string | null;
      is_pinned: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      revision: number;
    }>>(query);

    return rows.map((r) => ({
      ...r,
      is_pinned: Boolean(r.is_pinned),
      content: typeof r.content === "string" ? JSON.parse(r.content) : r.content,
    }));
  }

  public async getNoteById(id: string): Promise<Note | null> {
    await this.init();
    if (!this.db) return null;

    const rows = await this.db.select<Array<{
      id: string;
      user_id: string;
      title: string;
      content: string;
      collection_id: string | null;
      is_pinned: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      revision: number;
    }>>("SELECT * FROM notes WHERE id = $1 LIMIT 1", [id]);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      is_pinned: Boolean(r.is_pinned),
      content: typeof r.content === "string" ? JSON.parse(r.content) : r.content,
    };
  }

  public async saveNote(note: Note): Promise<void> {
    await this.init();
    if (!this.db) return;

    const contentStr = JSON.stringify(note.content);
    const isPinnedInt = note.is_pinned ? 1 : 0;

    await this.db.execute(
      `INSERT INTO notes (id, user_id, title, content, collection_id, is_pinned, created_at, updated_at, deleted_at, revision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         collection_id = excluded.collection_id,
         is_pinned = excluded.is_pinned,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision`,
      [
        note.id,
        note.user_id,
        note.title,
        contentStr,
        note.collection_id,
        isPinnedInt,
        note.created_at,
        note.updated_at,
        note.deleted_at,
        note.revision,
      ],
    );
  }

  public async deleteNote(id: string, hard = false): Promise<void> {
    await this.init();
    if (!this.db) return;

    if (hard) {
      await this.db.execute("DELETE FROM notes WHERE id = $1", [id]);
    } else {
      const now = nowISO();
      await this.db.execute(
        "UPDATE notes SET deleted_at = $1, updated_at = $2, revision = revision + 1 WHERE id = $3",
        [now, now, id],
      );
    }
  }

  public async getCollections(): Promise<Collection[]> {
    await this.init();
    if (!this.db) return [];

    return await this.db.select<Collection[]>("SELECT * FROM collections ORDER BY name ASC");
  }

  public async saveCollection(collection: Collection): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.execute(
      `INSERT INTO collections (id, user_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         updated_at = excluded.updated_at`,
      [collection.id, collection.user_id, collection.name, collection.created_at, collection.updated_at],
    );
  }

  public async deleteCollection(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    // Unset collection_id on notes
    await this.db.execute("UPDATE notes SET collection_id = NULL WHERE collection_id = $1", [id]);
    await this.db.execute("DELETE FROM collections WHERE id = $1", [id]);
  }

  public async enqueueSync(
    item: Omit<SyncQueueItem, "id" | "created_at" | "status" | "retries">,
  ): Promise<SyncQueueItem> {
    await this.init();
    const fullItem: SyncQueueItem = {
      ...item,
      id: generateUUID(),
      created_at: nowISO(),
      status: "pending",
      retries: 0,
      last_error: null,
    };

    if (!this.db) return fullItem;

    await this.db.execute(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, created_at, retries, last_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        fullItem.id,
        fullItem.entity_type,
        fullItem.entity_id,
        fullItem.operation,
        JSON.stringify(fullItem.payload),
        fullItem.status,
        fullItem.created_at,
        fullItem.retries,
        fullItem.last_error || null,
      ],
    );

    return fullItem;
  }

  public async getPendingSyncQueue(): Promise<SyncQueueItem[]> {
    await this.init();
    if (!this.db) return [];

    const rows = await this.db.select<Array<{
      id: string;
      entity_type: "note" | "collection";
      entity_id: string;
      operation: "insert" | "update" | "delete";
      payload: string;
      status: SyncStatus;
      created_at: string;
      retries: number;
      last_error?: string | null;
    }>>("SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC");

    return rows.map((r) => ({
      ...r,
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
    }));
  }

  public async updateSyncQueueItem(id: string, status: SyncStatus, error?: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    if (error) {
      await this.db.execute(
        "UPDATE sync_queue SET status = $1, last_error = $2, retries = retries + 1 WHERE id = $3",
        [status, error, id],
      );
    } else {
      await this.db.execute("UPDATE sync_queue SET status = $1 WHERE id = $2", [status, id]);
    }
  }

  public async removeSyncQueueItem(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    await this.db.execute("DELETE FROM sync_queue WHERE id = $1", [id]);
  }

  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();
    if (!this.db) return defaultValue;

    const rows = await this.db.select<Array<{ key: string; value: string }>>(
      "SELECT value FROM settings WHERE key = $1 LIMIT 1",
      [key],
    );
    if (!rows || rows.length === 0) return defaultValue;
    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return defaultValue;
    }
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.execute(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)],
    );
  }

  public async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.execute("DELETE FROM notes; DELETE FROM collections; DELETE FROM sync_queue; DELETE FROM settings;");
  }
}
