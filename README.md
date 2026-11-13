<div align="center">

# 📝 Noted

**A fast, elegant, offline-first notes application built for high-productivity writing and seamless cloud sync.**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19.1-61dafb.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-57%20Passing-brightgreen.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a>
</p>

</div>

---

## Overview

**Noted** is a modern, privacy-focused note-taking workspace designed for speed, fluidity, and absolute data ownership. Whether running as a native desktop application via Tauri v2 or inside any web browser, Noted provides a distraction-free environment for organizing thoughts, technical documentation, meeting summaries, task checklists, and creative writing.

Built on an **offline-first storage foundation**, your notes are saved locally instantly with zero latency—utilizing SQLite on desktop and IndexedDB on the web. When connected, an incremental cloud synchronization engine backed by Supabase keeps all your devices continuously in sync with revision-based conflict resolution.

## Key Features

- **⚡ Blazing Fast & Offline-First**: Zero loading delays. Writes immediately commit to local storage (SQLite on desktop, IndexedDB on web) with background sync.
- **✍️ Powerful Hybrid Editor**: Built on [TipTap v3](https://tiptap.dev/) with full Markdown shortcuts, slash command menu (`/`), floating bubble formatting bar, task lists, code blocks, and callouts.
- **📋 Intelligent Markdown Paste & Image Handling**: Automatically detects pasted raw Markdown or HTML and translates it into native blocks. Supports drag-and-drop and clipboard paste for images.
- **🔄 Incremental Cloud Sync**: Powered by Supabase. Offline edits are queued in an append-only mutation log and synchronized seamlessly with revision-based conflict resolution.
- **🗂️ Flexible Collections & Organization**: Group notes into custom collections with custom icons, pin critical notes to the top, archive completed items, and recover deleted notes from Trash.
- **🏷️ Automated Note Classification**: Intelligently classifies notes into categories (Checklists, Code Snippets, Meeting Notes, Journals, Reading Notes) based on structural heuristics.
- **🔍 Instant Search & Quick Switcher**: Sub-millisecond full-text search across titles, note content, and tags with hit highlighting (`Cmd/Ctrl + K`).
- **🎛️ Dual View Modes**: Switch between compact **List View** and card-based **Grid View** to match your preferred workflow.
- **🎨 Modern Aesthetic & Theming**: Polished interface with Tailwind CSS v4, supporting dynamic Light, Dark, and System appearance modes.
- **📊 Real-Time Writing Metrics**: Instant word count, character count, and estimated reading time.
- **📤 Versatile Exporting**: Export any note as Markdown (`.md`), HTML (`.html`), or plain text (`.txt`) at any time.

## System Architecture

Noted is built with an **offline-first, multi-target architecture**. The application runs both as a cross-platform desktop binary via Tauri v2 and as a high-performance web application, sharing a unified React TypeScript codebase.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Noted Client Application                        │
│               (React 19 + TypeScript + Vite + Tailwind v4)              │
├───────────────────────────────────┬────────────────────────────────────┤
│           Desktop Mode            │              Web Mode              │
│       (Tauri v2 + Rust Core)      │        (Standard Web Browser)      │
├───────────────────────────────────┼────────────────────────────────────┤
│     TauriSqlAdapter (SQLite)      │      IndexedDBAdapter (IDB)        │
│    Local persistent database      │      In-browser transactional DB   │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  └─────────────────┬──────────────────┘
                                    ▼
                      ┌───────────────────────────┐
                      │    StorageAdapter API     │
                      │   (Unified CRUD & Queue)  │
                      └─────────────┬─────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │    SyncEngine (Worker)    │
                      │  Queues & Retry Mechanics │
                      └─────────────┬─────────────┘
                                    │ (HTTPS / WebSockets)
                                    ▼
                      ┌───────────────────────────┐
                      │   Supabase Cloud Backend  │
                      │  PostgreSQL + Auth + RLS  │
                      └───────────────────────────┘
```

### Storage Adapter Pattern
- **Dynamic Adapter Resolution**: The storage factory evaluates the runtime context via `window.__TAURI_INTERNALS__`. If running inside Tauri's webview, it instantiates the native SQLite adapter; otherwise, it gracefully mounts IndexedDB.
- **Transactional Consistency**: Both adapters expose identical async signatures for fetching, inserting, updating, soft-deleting, and batching records.
- **Zero-Latency UI**: All user mutations commit to the local database immediately and update React state optimistically before pushing to the cloud sync queue.

## Cloud Synchronization & Conflict Resolution

Noted incorporates an incremental synchronization engine (`SyncEngine`) designed to function seamlessly under unstable network conditions or prolonged offline periods.

### How Synchronization Works
1. **Local Mutation Queuing**: Every note modification (create, update, archive, pin, delete) is written to a persistent local sync queue (`sync_queue`) with an incremented revision counter.
2. **Network Detection & Periodic Polling**: The engine listens to browser online/offline events (`window.addEventListener('online')`) and conducts background sync passes every 20 seconds.
3. **Exponential Backoff**: Transient errors automatically trigger exponential backoff delays (`min(60s, 1s * 2^retries)`), preventing API thrashing and rate limits.
4. **Bidirectional Reconciliation**:
   - **Outbound**: Local queue items are pushed to Supabase using upsert transactions. Once confirmed, items are purged from the local queue.
   - **Inbound**: Remote changes are pulled by querying items updated since `last_synced_at`.
5. **Conflict Resolution Strategy**:
   - **Revision Precedence**: Each note maintains a monotonic `revision` integer. Remote updates with higher revisions supersede local state if no local uncommitted changes exist.
   - **Timestamp Fallback**: When equal revisions conflict, ISO 8601 timestamps (`updated_at`) arbitrate the winning state.
   - **Non-Destructive Soft Deletes**: Deleted notes are flagged with `deleted_at` timestamps rather than immediate drops, allowing restoration across all connected devices.
