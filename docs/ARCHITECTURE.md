# Architecture & Sync

Noted is built with an **offline-first, multi-target architecture** running on desktop (Tauri v2 + Rust), Android (Tauri v2), and the web from a unified React + TypeScript codebase.

## Storage Adapter Pattern

- **Dynamic Adapter Resolution:** At runtime, Noted checks for `window.__TAURI_INTERNALS__`. Inside Tauri it uses `TauriSqlAdapter` (SQLite with FTS5 full-text search); in a browser it falls back to `IndexedDBAdapter`.
- **Zero-Latency Writes:** Every edit commits immediately to local storage and updates React state optimistically before queuing background cloud sync.

```
Noted Client (React 19 + TypeScript + TipTap v3)
 ├── Desktop / Android (Tauri v2 + Rust) ──▶ TauriSqlAdapter (SQLite + FTS5)
 └── Web Browser                         ──▶ IndexedDBAdapter
                    │
                    ▼
             SyncEngine (Queue + Exponential Backoff)
                    │
                    ▼
        Supabase Cloud (PostgreSQL + Auth + RLS)
```

## Cloud Synchronization & Conflict Resolution

1. **Local Mutation Queue:** Create, update, pin, and delete actions are recorded in `sync_queue` with a monotonic `revision` counter.
2. **Background Sync:** `SyncEngine` listens to online/offline events, syncs periodically, and applies exponential backoff on transient errors.
3. **Conflict Resolution:** Higher `revision` wins; equal revisions fall back to `updated_at` timestamps. Deletes are non-destructive soft deletes (`deleted_at`).

## Supabase Setup (Optional)

Noted works 100% offline with no account required. To enable cross-device sync:

1. Run [`supabase/migrations/20261112000000_initial_schema.sql`](../supabase/migrations/20261112000000_initial_schema.sql) in your Supabase SQL Editor (or via `supabase db reset`).
2. Open **Settings** (`Cmd/Ctrl + ,`) → **Sync & Account** and enter your **Supabase Project URL** and **Anon Key**.
