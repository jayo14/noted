import type {
  Note,
  Collection,
  SyncQueueItem,
  SyncStatus,
  ClipboardItem,
  ClipboardContentType,
  ClipboardCategory,
} from "@/types";
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

        -- SQLite FTS5 Full-Text Search Virtual Table
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
          id UNINDEXED,
          title,
          content_text,
          tokenize = 'porter unicode61'
        );

        -- Synchronization Triggers for FTS5
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
          INSERT INTO notes_fts(id, title, content_text)
          VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
          UPDATE notes_fts SET title = new.title, content_text = new.content WHERE id = new.id;
        END;

        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
          DELETE FROM notes_fts WHERE id = old.id;
        END;

        -- Linux Clipboard History & FTS5
        CREATE TABLE IF NOT EXISTS clipboard_history (
          id TEXT PRIMARY KEY,
          content_type TEXT NOT NULL DEFAULT 'text',
          content_text TEXT NOT NULL DEFAULT '',
          content_html TEXT,
          image_path TEXT,
          image_width INTEGER,
          image_height INTEGER,
          content_hash TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'text',
          is_pinned INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          last_copied_at TEXT NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_clipboard_hash ON clipboard_history(content_hash);
        CREATE INDEX IF NOT EXISTS idx_clipboard_last_copied ON clipboard_history(last_copied_at DESC);

        CREATE VIRTUAL TABLE IF NOT EXISTS clipboard_fts USING fts5(
          id UNINDEXED,
          content_text,
          tokenize = 'porter unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS clipboard_ai AFTER INSERT ON clipboard_history BEGIN
          INSERT INTO clipboard_fts(id, content_text)
          VALUES (new.id, new.content_text);
        END;

        CREATE TRIGGER IF NOT EXISTS clipboard_au AFTER UPDATE ON clipboard_history BEGIN
          UPDATE clipboard_fts SET content_text = new.content_text WHERE id = new.id;
        END;

        CREATE TRIGGER IF NOT EXISTS clipboard_ad AFTER DELETE ON clipboard_history BEGIN
          DELETE FROM clipboard_fts WHERE id = old.id;
        END;
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

    await this.db.execute("DELETE FROM notes; DELETE FROM collections; DELETE FROM sync_queue; DELETE FROM settings; DELETE FROM notes_fts;");
  }

  public async searchNotesFTS(query: string): Promise<Note[]> {
    await this.init();
    if (!this.db || !query.trim()) return [];

    const sanitizedQuery = query.replace(/[^a-zA-Z0-9_\s]/g, "").trim();
    if (!sanitizedQuery) return [];

    const ftsQuery = `
      SELECT n.* FROM notes n
      JOIN notes_fts f ON n.id = f.id
      WHERE notes_fts MATCH $1 AND n.deleted_at IS NULL
      ORDER BY bm25(notes_fts), n.updated_at DESC
    `;

    try {
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
      }>>(ftsQuery, [`${sanitizedQuery}*`]);

      return rows.map((r) => ({
        ...r,
        is_pinned: Boolean(r.is_pinned),
        content: typeof r.content === "string" ? JSON.parse(r.content) : r.content,
      }));
    } catch (e) {
      console.warn("[TauriSqlAdapter] FTS search fallback:", e);
      return [];
    }
  }

  private mapClipboardRow(r: {
    id: string;
    content_type: string;
    content_text: string;
    content_html: string | null;
    image_path: string | null;
    image_width: number | null;
    image_height: number | null;
    content_hash: string;
    category: string;
    is_pinned: number;
    created_at: string;
    last_copied_at: string;
  }): ClipboardItem {
    return {
      ...r,
      content_type: r.content_type as ClipboardContentType,
      category: r.category as ClipboardCategory,
      is_pinned: Boolean(r.is_pinned),
    };
  }

  public async getClipboardHistory(limit = 500): Promise<ClipboardItem[]> {
    await this.init();
    if (!this.db) return [];

    const rows = await this.db.select<Array<{
      id: string;
      content_type: string;
      content_text: string;
      content_html: string | null;
      image_path: string | null;
      image_width: number | null;
      image_height: number | null;
      content_hash: string;
      category: string;
      is_pinned: number;
      created_at: string;
      last_copied_at: string;
    }>>(
      "SELECT * FROM clipboard_history ORDER BY is_pinned DESC, last_copied_at DESC LIMIT $1",
      [limit],
    );

    return rows.map((r) => this.mapClipboardRow(r));
  }

  public async searchClipboardHistory(query: string, limit = 200): Promise<ClipboardItem[]> {
    await this.init();
    if (!this.db) return [];
    const trimmed = query.trim();
    if (!trimmed) return this.getClipboardHistory(limit);

    const sanitized = trimmed.replace(/[^a-zA-Z0-9_\s]/g, "").trim();
    const likePattern = `%${trimmed}%`;

    if (sanitized) {
      try {
        const rows = await this.db.select<Array<{
          id: string;
          content_type: string;
          content_text: string;
          content_html: string | null;
          image_path: string | null;
          image_width: number | null;
          image_height: number | null;
          content_hash: string;
          category: string;
          is_pinned: number;
          created_at: string;
          last_copied_at: string;
        }>>(
          `SELECT c.* FROM clipboard_history c
           WHERE c.id IN (SELECT id FROM clipboard_fts WHERE clipboard_fts MATCH $1)
              OR c.content_text LIKE $2
           ORDER BY c.is_pinned DESC, c.last_copied_at DESC
           LIMIT $3`,
          [`${sanitized}*`, likePattern, limit],
        );
        return rows.map((r) => this.mapClipboardRow(r));
      } catch {
        // Fall through to LIKE query
      }
    }

    const rows = await this.db.select<Array<{
      id: string;
      content_type: string;
      content_text: string;
      content_html: string | null;
      image_path: string | null;
      image_width: number | null;
      image_height: number | null;
      content_hash: string;
      category: string;
      is_pinned: number;
      created_at: string;
      last_copied_at: string;
    }>>(
      "SELECT * FROM clipboard_history WHERE content_text LIKE $1 ORDER BY is_pinned DESC, last_copied_at DESC LIMIT $2",
      [likePattern, limit],
    );

    return rows.map((r) => this.mapClipboardRow(r));
  }

  public async upsertClipboardItem(
    entry: Omit<ClipboardItem, "id" | "is_pinned" | "created_at" | "last_copied_at">,
    maxUnpinned = 500,
  ): Promise<{ item: ClipboardItem; prunedImagePaths: string[] }> {
    await this.init();
    const now = nowISO();
    const id = generateUUID();

    if (!this.db) {
      return {
        item: { ...entry, id, is_pinned: false, created_at: now, last_copied_at: now },
        prunedImagePaths: [],
      };
    }

    await this.db.execute(
      `INSERT INTO clipboard_history (
        id, content_type, content_text, content_html, image_path, image_width, image_height,
        content_hash, category, is_pinned, created_at, last_copied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $10)
      ON CONFLICT(content_hash) DO UPDATE SET
        last_copied_at = excluded.last_copied_at,
        content_text = excluded.content_text,
        content_html = COALESCE(excluded.content_html, clipboard_history.content_html),
        image_path = COALESCE(excluded.image_path, clipboard_history.image_path),
        image_width = COALESCE(excluded.image_width, clipboard_history.image_width),
        image_height = COALESCE(excluded.image_height, clipboard_history.image_height),
        category = excluded.category`,
      [
        id,
        entry.content_type,
        entry.content_text,
        entry.content_html,
        entry.image_path,
        entry.image_width,
        entry.image_height,
        entry.content_hash,
        entry.category,
        now,
      ],
    );

    const savedRows = await this.db.select<Array<{
      id: string;
      content_type: string;
      content_text: string;
      content_html: string | null;
      image_path: string | null;
      image_width: number | null;
      image_height: number | null;
      content_hash: string;
      category: string;
      is_pinned: number;
      created_at: string;
      last_copied_at: string;
    }>>(
      "SELECT * FROM clipboard_history WHERE content_hash = $1 LIMIT 1",
      [entry.content_hash],
    );

    // Prune oldest unpinned items beyond maxUnpinned
    const toPrune = await this.db.select<Array<{ id: string; image_path: string | null }>>(
      `SELECT id, image_path FROM clipboard_history
       WHERE is_pinned = 0
       ORDER BY last_copied_at DESC
       LIMIT -1 OFFSET $1`,
      [maxUnpinned],
    );

    const prunedImagePaths: string[] = [];
    if (toPrune.length > 0) {
      for (const row of toPrune) {
        await this.db.execute("DELETE FROM clipboard_history WHERE id = $1", [row.id]);
        if (row.image_path) {
          prunedImagePaths.push(row.image_path);
        }
      }
    }

    const item = savedRows[0]
      ? this.mapClipboardRow(savedRows[0])
      : { ...entry, id, is_pinned: false, created_at: now, last_copied_at: now };

    return { item, prunedImagePaths };
  }

  public async toggleClipboardPin(id: string): Promise<ClipboardItem | null> {
    await this.init();
    if (!this.db) return null;

    await this.db.execute(
      "UPDATE clipboard_history SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = $1",
      [id],
    );

    const rows = await this.db.select<Array<{
      id: string;
      content_type: string;
      content_text: string;
      content_html: string | null;
      image_path: string | null;
      image_width: number | null;
      image_height: number | null;
      content_hash: string;
      category: string;
      is_pinned: number;
      created_at: string;
      last_copied_at: string;
    }>>(
      "SELECT * FROM clipboard_history WHERE id = $1 LIMIT 1",
      [id],
    );

    return rows[0] ? this.mapClipboardRow(rows[0]) : null;
  }

  public async deleteClipboardItem(id: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    const rows = await this.db.select<Array<{ image_path: string | null }>>(
      "SELECT image_path FROM clipboard_history WHERE id = $1 LIMIT 1",
      [id],
    );
    const imagePath = rows[0]?.image_path || null;
    await this.db.execute("DELETE FROM clipboard_history WHERE id = $1", [id]);
    return imagePath;
  }

  public async clearUnpinnedClipboard(): Promise<string[]> {
    await this.init();
    if (!this.db) return [];

    const rows = await this.db.select<Array<{ image_path: string | null }>>(
      "SELECT image_path FROM clipboard_history WHERE is_pinned = 0 AND image_path IS NOT NULL",
    );
    const imagePaths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p));
    await this.db.execute("DELETE FROM clipboard_history WHERE is_pinned = 0");
    return imagePaths;
  }
}
