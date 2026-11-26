import type { Note, Collection, SyncQueueItem, SyncStatus, ClipboardItem } from "@/types";
import type { DatabaseAdapter } from "./types";
import { generateUUID, nowISO } from "@/lib/utils";

const DB_NAME = "noted_local_db";
const DB_VERSION = 1;

export class IndexedDBAdapter implements DatabaseAdapter {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  // In-memory fallback for SSR, Vitest, or environments where IDB is unavailable
  private memNotes = new Map<string, Note>();
  private memCollections = new Map<string, Collection>();
  private memSyncQueue = new Map<string, SyncQueueItem>();
  private memSettings = new Map<string, unknown>();
  private memClipboard = new Map<string, ClipboardItem>();

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    if (typeof indexedDB === "undefined") {
      // In SSR or non-browser fallback
      this.isInitialized = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("updated_at", "updated_at", { unique: false });
          notesStore.createIndex("collection_id", "collection_id", { unique: false });
          notesStore.createIndex("deleted_at", "deleted_at", { unique: false });
        }

        if (!db.objectStoreNames.contains("collections")) {
          const colStore = db.createObjectStore("collections", { keyPath: "id" });
          colStore.createIndex("name", "name", { unique: false });
        }

        if (!db.objectStoreNames.contains("sync_queue")) {
          const syncStore = db.createObjectStore("sync_queue", { keyPath: "id" });
          syncStore.createIndex("status", "status", { unique: false });
          syncStore.createIndex("created_at", "created_at", { unique: false });
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore | null {
    if (!this.db) return null;
    try {
      const tx = this.db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch (e) {
      console.error(`Error opening store ${storeName}:`, e);
      return null;
    }
  }

  public async getNotes(includeDeleted = false): Promise<Note[]> {
    await this.init();
    if (!this.db) {
      const all = Array.from(this.memNotes.values());
      const filtered = includeDeleted ? all : all.filter((n) => !n.deleted_at);
      filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return filtered;
    }

    return new Promise((resolve) => {
      const store = this.getStore("notes", "readonly");
      if (!store) {
        resolve([]);
        return;
      }

      const request = store.getAll();
      request.onsuccess = () => {
        const notes = (request.result as Note[]) || [];
        const filtered = includeDeleted ? notes : notes.filter((n) => !n.deleted_at);
        // Sort descending by updated_at
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        resolve(filtered);
      };
      request.onerror = () => resolve([]);
    });
  }

  public async getNoteById(id: string): Promise<Note | null> {
    await this.init();
    if (!this.db) {
      return this.memNotes.get(id) || null;
    }

    return new Promise((resolve) => {
      const store = this.getStore("notes", "readonly");
      if (!store) {
        resolve(null);
        return;
      }
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  public async saveNote(note: Note): Promise<void> {
    await this.init();
    if (!this.db) {
      this.memNotes.set(note.id, { ...note });
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("notes", "readwrite");
      if (!store) {
        resolve();
        return;
      }
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteNote(id: string, hard = false): Promise<void> {
    await this.init();
    if (!this.db) {
      if (hard) {
        this.memNotes.delete(id);
      } else {
        const note = this.memNotes.get(id);
        if (note) {
          note.deleted_at = nowISO();
          note.updated_at = nowISO();
          note.revision = (note.revision || 0) + 1;
        }
      }
      return;
    }

    if (hard) {
      return new Promise((resolve, reject) => {
        const store = this.getStore("notes", "readwrite");
        if (!store) return resolve();
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      const note = await this.getNoteById(id);
      if (note) {
        note.deleted_at = nowISO();
        note.updated_at = nowISO();
        note.revision = (note.revision || 0) + 1;
        await this.saveNote(note);
      }
    }
  }

  public async getCollections(): Promise<Collection[]> {
    await this.init();
    if (!this.db) {
      const cols = Array.from(this.memCollections.values());
      cols.sort((a, b) => a.name.localeCompare(b.name));
      return cols;
    }

    return new Promise((resolve) => {
      const store = this.getStore("collections", "readonly");
      if (!store) return resolve([]);
      const request = store.getAll();
      request.onsuccess = () => {
        const collections = (request.result as Collection[]) || [];
        collections.sort((a, b) => a.name.localeCompare(b.name));
        resolve(collections);
      };
      request.onerror = () => resolve([]);
    });
  }

  public async saveCollection(collection: Collection): Promise<void> {
    await this.init();
    if (!this.db) {
      this.memCollections.set(collection.id, { ...collection });
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("collections", "readwrite");
      if (!store) return resolve();
      const request = store.put(collection);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteCollection(id: string): Promise<void> {
    await this.init();
    if (!this.db) {
      this.memCollections.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("collections", "readwrite");
      if (!store) return resolve();
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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

    if (!this.db) {
      this.memSyncQueue.set(fullItem.id, fullItem);
      return fullItem;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("sync_queue", "readwrite");
      if (!store) return resolve(fullItem);
      const request = store.put(fullItem);
      request.onsuccess = () => resolve(fullItem);
      request.onerror = () => reject(request.error);
    });
  }

  public async getPendingSyncQueue(): Promise<SyncQueueItem[]> {
    await this.init();
    if (!this.db) {
      const items = Array.from(this.memSyncQueue.values());
      const pending = items.filter((i) => i.status === "pending" || i.status === "failed");
      pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return pending;
    }

    return new Promise((resolve) => {
      const store = this.getStore("sync_queue", "readonly");
      if (!store) return resolve([]);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result as SyncQueueItem[]) || [];
        const pending = items.filter((i) => i.status === "pending" || i.status === "failed");
        pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(pending);
      };
      request.onerror = () => resolve([]);
    });
  }

  public async updateSyncQueueItem(id: string, status: SyncStatus, error?: string): Promise<void> {
    await this.init();
    if (!this.db) {
      const item = this.memSyncQueue.get(id);
      if (item) {
        item.status = status;
        if (error) {
          item.last_error = error;
          item.retries = (item.retries || 0) + 1;
        }
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("sync_queue", "readwrite");
      if (!store) return resolve();
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as SyncQueueItem | undefined;
        if (!item) return resolve();
        item.status = status;
        if (error) {
          item.last_error = error;
          item.retries = (item.retries || 0) + 1;
        }
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  public async removeSyncQueueItem(id: string): Promise<void> {
    await this.init();
    if (!this.db) {
      this.memSyncQueue.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("sync_queue", "readwrite");
      if (!store) return resolve();
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();
    if (!this.db) {
      try {
        if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem(`noted_setting_${key}`);
          if (stored !== null) return JSON.parse(stored);
        }
      } catch {
        // Fallback to in-memory settings map
      }
      return this.memSettings.has(key) ? (this.memSettings.get(key) as T) : defaultValue;
    }

    return new Promise((resolve) => {
      const store = this.getStore("settings", "readonly");
      if (!store) {
        try {
          const stored = localStorage.getItem(`noted_setting_${key}`);
          resolve(stored !== null ? JSON.parse(stored) : defaultValue);
        } catch {
          resolve(defaultValue);
        }
        return;
      }
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    await this.init();
    try {
      localStorage.setItem(`noted_setting_${key}`, JSON.stringify(value));
    } catch {}

    if (!this.db) {
      this.memSettings.set(key, value);
      return;
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("settings", "readwrite");
      if (!store) return resolve();
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearAllData(): Promise<void> {
    await this.init();
    this.memNotes.clear();
    this.memCollections.clear();
    this.memSyncQueue.clear();
    this.memSettings.clear();
    this.memClipboard.clear();

    if (!this.db) return;

    const stores = ["notes", "collections", "sync_queue", "settings"];
    for (const storeName of stores) {
      await new Promise<void>((resolve) => {
        const store = this.getStore(storeName, "readwrite");
        if (store) {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } else {
          resolve();
        }
      });
    }
  }

  private sortClipboardItems(items: ClipboardItem[]): ClipboardItem[] {
    return items.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.last_copied_at).getTime() - new Date(a.last_copied_at).getTime();
    });
  }

  public async getClipboardHistory(limit = 500): Promise<ClipboardItem[]> {
    await this.init();
    return this.sortClipboardItems(Array.from(this.memClipboard.values())).slice(0, limit);
  }

  public async searchClipboardHistory(query: string, limit = 200): Promise<ClipboardItem[]> {
    await this.init();
    const q = query.trim().toLowerCase();
    if (!q) return this.getClipboardHistory(limit);
    const filtered = Array.from(this.memClipboard.values()).filter((item) =>
      item.content_text.toLowerCase().includes(q),
    );
    return this.sortClipboardItems(filtered).slice(0, limit);
  }

  public async upsertClipboardItem(
    entry: Omit<ClipboardItem, "id" | "is_pinned" | "created_at" | "last_copied_at">,
    maxUnpinned = 500,
  ): Promise<{ item: ClipboardItem; prunedImagePaths: string[] }> {
    await this.init();
    const now = nowISO();

    const existing = Array.from(this.memClipboard.values()).find(
      (i) => i.content_hash === entry.content_hash,
    );

    let saved: ClipboardItem;
    if (existing) {
      saved = {
        ...existing,
        content_text: entry.content_text,
        content_html: entry.content_html ?? existing.content_html,
        image_path: entry.image_path ?? existing.image_path,
        image_width: entry.image_width ?? existing.image_width,
        image_height: entry.image_height ?? existing.image_height,
        category: entry.category,
        last_copied_at: now,
      };
    } else {
      saved = {
        ...entry,
        id: generateUUID(),
        is_pinned: false,
        created_at: now,
        last_copied_at: now,
      };
    }
    this.memClipboard.set(saved.id, saved);

    const unpinned = Array.from(this.memClipboard.values())
      .filter((i) => !i.is_pinned)
      .sort((a, b) => new Date(b.last_copied_at).getTime() - new Date(a.last_copied_at).getTime());

    const prunedImagePaths: string[] = [];
    if (unpinned.length > maxUnpinned) {
      for (const old of unpinned.slice(maxUnpinned)) {
        this.memClipboard.delete(old.id);
        if (old.image_path) prunedImagePaths.push(old.image_path);
      }
    }

    return { item: saved, prunedImagePaths };
  }

  public async toggleClipboardPin(id: string): Promise<ClipboardItem | null> {
    await this.init();
    const existing = this.memClipboard.get(id);
    if (!existing) return null;
    const updated = { ...existing, is_pinned: !existing.is_pinned };
    this.memClipboard.set(id, updated);
    return updated;
  }

  public async deleteClipboardItem(id: string): Promise<string | null> {
    await this.init();
    const existing = this.memClipboard.get(id);
    this.memClipboard.delete(id);
    return existing?.image_path || null;
  }

  public async clearUnpinnedClipboard(): Promise<string[]> {
    await this.init();
    const paths: string[] = [];
    for (const [id, item] of this.memClipboard.entries()) {
      if (!item.is_pinned) {
        if (item.image_path) paths.push(item.image_path);
        this.memClipboard.delete(id);
      }
    }
    return paths;
  }
}
