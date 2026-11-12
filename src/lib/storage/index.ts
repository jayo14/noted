import type { DatabaseAdapter } from "./types";
import { IndexedDBAdapter } from "./indexeddb";
import { TauriSqlAdapter } from "./tauri-sql";

export * from "./types";
export * from "./indexeddb";
export * from "./tauri-sql";

let instance: DatabaseAdapter | null = null;

export async function getStorageAdapter(): Promise<DatabaseAdapter> {
  if (instance) return instance;

  const isTauri =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  if (isTauri) {
    try {
      const tauriAdapter = new TauriSqlAdapter();
      await tauriAdapter.init();
      instance = tauriAdapter;
      console.log("[Storage] Initialized Tauri SQLite adapter");
      return instance;
    } catch (e) {
      console.warn("[Storage] Tauri SQLite failed to init, falling back to IndexedDB:", e);
    }
  }

  const idbAdapter = new IndexedDBAdapter();
  await idbAdapter.init();
  instance = idbAdapter;
  console.log("[Storage] Initialized IndexedDB adapter");
  return instance;
}
