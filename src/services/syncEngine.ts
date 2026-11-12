import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Note, Collection, SyncQueueItem } from "@/types";
import { getStorageAdapter } from "@/lib/storage";
import { generateUUID, nowISO } from "@/lib/utils";
import { authService } from "./authService";

export interface SyncEngineStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export class SyncEngine {
  private static instance: SyncEngine;
  private client: SupabaseClient | null = null;
  private deviceId: string | null = null;
  private deviceName = "Current Device";
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<(status: SyncEngineStatus) => void> = new Set();
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  public subscribe(listener: (status: SyncEngineStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public getStatus(): SyncEngineStatus {
    return {
      isSyncing: this.isSyncing,
      pendingCount: 0,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  public async init(url?: string, key?: string): Promise<void> {
    const storage = await getStorageAdapter();

    this.deviceId = await storage.getSetting<string>("device_id", "");
    if (!this.deviceId) {
      this.deviceId = generateUUID();
      await storage.setSetting("device_id", this.deviceId);
    }

    this.lastSyncedAt = await storage.getSetting<string | null>("last_synced_at", null);

    const savedUrl = url || (await storage.getSetting<string>("supabase_url", ""));
    const savedKey = key || (await storage.getSetting<string>("supabase_key", ""));

    if (savedUrl && savedKey) {
      try {
        this.client = createClient(savedUrl, savedKey);
      } catch (e) {
        console.warn("[SyncEngine] Failed to initialize Supabase client:", e);
      }
    }
  }

  public async configureSupabase(url: string, key: string): Promise<void> {
    const storage = await getStorageAdapter();
    await storage.setSetting("supabase_url", url);
    await storage.setSetting("supabase_key", key);

    if (url && key) {
      this.client = createClient(url, key);
    } else {
      this.client = null;
    }
  }

  public startPeriodicSync(intervalMs = 20000): () => void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);

    this.intervalTimer = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }
      this.syncNow().catch((err) => console.warn("[SyncEngine] Periodic sync error:", err));
    }, intervalMs);

    const onOnline = () => {
      this.syncNow().catch((err) => console.warn("[SyncEngine] Online trigger sync error:", err));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }

    return () => {
      if (this.intervalTimer) clearInterval(this.intervalTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    };
  }

  public async syncNow(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing) return { processed: 0, errors: 0 };

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    const storage = await getStorageAdapter();
    const queue = await storage.getPendingSyncQueue();

    let processed = 0;
    let errors = 0;

    try {
      // 1. Process Outbound Sync Queue
      for (const item of queue) {
        // Exponential backoff check
        if (item.retries > 0) {
          const backoffDelay = Math.min(60000, 1000 * Math.pow(2, item.retries));
          const timeSinceCreated = Date.now() - new Date(item.created_at).getTime();
          if (timeSinceCreated < backoffDelay) {
            continue; // Skip for now until backoff window passes
          }
        }

        try {
          if (this.client) {
            await this.syncItemWithRemote(item);
          }
          // Mark completed and remove from queue
          await storage.removeSyncQueueItem(item.id);
          processed++;
        } catch (itemErr: unknown) {
          errors++;
          const errMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          await storage.updateSyncQueueItem(item.id, "failed", errMsg);
        }
      }

      // 2. Process Inbound Remote Sync (Pull changes)
      if (this.client) {
        await this.pullRemoteChanges();
        await this.syncDeviceHeartbeat();
      }

      const now = nowISO();
      this.lastSyncedAt = now;
      await storage.setSetting("last_synced_at", now);
    } catch (e: unknown) {
      this.lastError = e instanceof Error ? e.message : String(e);
      console.error("[SyncEngine] Sync failed:", e);
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { processed, errors };
  }

  private async syncItemWithRemote(item: SyncQueueItem): Promise<void> {
    if (!this.client) return;

    if (item.entity_type === "note") {
      if (item.operation === "delete" && item.payload.hard) {
        await this.client.from("notes").delete().eq("id", item.entity_id);
      } else {
        const payload = item.payload as unknown as Note;

        // Check remote revision for conflict detection
        const { data: remoteData } = await this.client
          .from("notes")
          .select("revision, updated_at, title, content")
          .eq("id", item.entity_id)
          .single();

        if (remoteData && remoteData.revision > payload.revision) {
          // Conflict detected! Create conflict copy to avoid losing either version
          console.warn(`[SyncEngine] Conflict detected on note ${payload.title}`);
          const storage = await getStorageAdapter();
          const conflictNote: Note = {
            id: generateUUID(),
            user_id: payload.user_id,
            title: `${payload.title} (Conflict Copy - ${this.deviceName})`,
            content: payload.content,
            collection_id: payload.collection_id,
            is_pinned: false,
            created_at: nowISO(),
            updated_at: nowISO(),
            deleted_at: null,
            revision: 1,
          };
          await storage.saveNote(conflictNote);
          await storage.enqueueSync({
            entity_type: "note",
            entity_id: conflictNote.id,
            operation: "insert",
            payload: conflictNote as unknown as Record<string, unknown>,
          });
          return;
        }

        // Upsert note into remote
        const { error } = await this.client.from("notes").upsert({
          id: payload.id,
          user_id: payload.user_id,
          title: payload.title,
          content: payload.content,
          collection_id: payload.collection_id,
          is_pinned: payload.is_pinned,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
          deleted_at: payload.deleted_at,
          revision: payload.revision,
        });

        if (error) throw error;
      }
    } else if (item.entity_type === "collection") {
      if (item.operation === "delete") {
        await this.client.from("collections").delete().eq("id", item.entity_id);
      } else {
        const payload = item.payload as unknown as Collection;
        const { error } = await this.client.from("collections").upsert({
          id: payload.id,
          user_id: payload.user_id,
          name: payload.name,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
        });
        if (error) throw error;
      }
    }
  }

  private getDevicePlatformName(): string {
    if (typeof navigator === "undefined") return "Desktop";
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad/i.test(ua)) return "iOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Desktop";
  }

  private async syncDeviceHeartbeat(): Promise<void> {
    if (!this.client || !this.deviceId) return;
    const userId = authService.getCurrentUserId();
    if (userId === "local-user") return;

    try {
      await this.client.from("devices").upsert({
        id: this.deviceId,
        user_id: userId,
        device_name: `${this.deviceName} (${this.getDevicePlatformName()})`,
        last_synced_at: nowISO(),
      });
    } catch (e) {
      // Non-blocking device heartbeat
      console.warn("[SyncEngine] Device heartbeat warning:", e);
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    if (!this.client) return;
    const storage = await getStorageAdapter();

    let notesQuery = this.client.from("notes").select("*");
    if (this.lastSyncedAt) {
      notesQuery = notesQuery.gt("updated_at", this.lastSyncedAt);
    }
    const { data: remoteNotes, error: notesError } = await notesQuery;
    if (notesError) throw notesError;

    if (remoteNotes && remoteNotes.length > 0) {
      const pendingQueue = await storage.getPendingSyncQueue();
      const pendingNoteIds = new Set(
        pendingQueue.filter((q) => q.entity_type === "note").map((q) => q.entity_id),
      );

      for (const remoteNote of remoteNotes as Note[]) {
        const localNote = await storage.getNoteById(remoteNote.id);

        if (!localNote) {
          await storage.saveNote(remoteNote);
          continue;
        }

        // Detect conflict: local has pending unpushed changes and contents differ
        const hasLocalPendingChanges = pendingNoteIds.has(localNote.id);
        const hasDifferentContent =
          JSON.stringify(localNote.content) !== JSON.stringify(remoteNote.content) ||
          localNote.title !== remoteNote.title;

        if (hasLocalPendingChanges && hasDifferentContent && remoteNote.revision !== localNote.revision) {
          // Conflict detected during pull! Preserve local version as conflict copy
          console.warn(`[SyncEngine] Conflict detected during pull for note: ${localNote.title}`);
          const conflictNote: Note = {
            id: generateUUID(),
            user_id: localNote.user_id,
            title: `${localNote.title} (Local Copy - ${this.getDevicePlatformName()})`,
            content: localNote.content,
            collection_id: localNote.collection_id,
            is_pinned: false,
            created_at: nowISO(),
            updated_at: nowISO(),
            deleted_at: null,
            revision: 1,
          };

          await storage.saveNote(conflictNote);
          await storage.enqueueSync({
            entity_type: "note",
            entity_id: conflictNote.id,
            operation: "insert",
            payload: conflictNote as unknown as Record<string, unknown>,
          });

          // Update primary note to remote's version
          await storage.saveNote(remoteNote);
        } else if (remoteNote.revision >= (localNote.revision || 1)) {
          await storage.saveNote(remoteNote);
        }
      }
    }

    let colsQuery = this.client.from("collections").select("*");
    if (this.lastSyncedAt) {
      colsQuery = colsQuery.gt("updated_at", this.lastSyncedAt);
    }
    const { data: remoteCols, error: colsError } = await colsQuery;
    if (colsError) throw colsError;

    if (remoteCols && remoteCols.length > 0) {
      for (const remoteCol of remoteCols as Collection[]) {
        await storage.saveCollection(remoteCol);
      }
    }
  }
}

export const syncEngine = SyncEngine.getInstance();
