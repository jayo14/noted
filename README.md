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

## Editor Capabilities & Markdown Support

Noted features a distraction-free, rich-text WYSIWYG editor backed by **TipTap v3** and ProseMirror, marrying the fluid experience of Notion with the speed and portability of raw Markdown.

### Slash Commands (`/`)
Type `/` on any blank line to invoke the quick-insert block menu:
| Command | Action | Description |
| :--- | :--- | :--- |
| `/text` | Paragraph | Regular paragraph body text |
| `/heading1` or `/h1` | Heading 1 | Large document section heading |
| `/heading2` or `/h2` | Heading 2 | Medium subsection heading |
| `/heading3` or `/h3` | Heading 3 | Small subsection heading |
| `/checklist` or `/todo` | Task List | Interactive checkboxes for actionable tasks |
| `/bulletList` or `/list` | Bullet List | Unordered bulleted ideas |
| `/orderedList` | Numbered List | Sequential enumerated list |
| `/quote` | Blockquote | Styled callout for citations and key takeaways |
| `/codeBlock` or `/code` | Code Block | Monospace syntax container |
| `/divider` or `/hr` | Horizontal Rule | Subtle section separator |

### Inline Bubble Formatting
Highlight any portion of text to reveal the contextual bubble menu for instant styling:
- **Bold** (`Cmd/Ctrl + B`)
- *Italic* (`Cmd/Ctrl + I`)
- <u>Underline</u> (`Cmd/Ctrl + U`)
- ~~Strikethrough~~ (`Cmd/Ctrl + Shift + X`)
- `Inline Code` (`` ` ``)
- ==Highlight== (Yellow accent background)
- [Hyperlinks](https://example.com) (`Cmd/Ctrl + K` in selection)

### Smart Paste & Image Handling
- **Markdown Conversion**: When pasting text containing Markdown syntax (e.g., `# Header`, `- [ ] todo`, ` ```code ``` `), Noted parses and embeds native blocks automatically.
- **Image Drag-and-Drop & Clipboard**: Paste or drag images directly into the editor; they are embedded seamlessly and persisted with the note document.

## Keyboard Shortcuts

Noted is engineered for full keyboard-driven navigation. Press `Cmd/Ctrl + /` at any time inside the app to bring up the interactive cheat sheet:

### General & Navigation
| Action | macOS Shortcut | Windows / Linux Shortcut |
| :--- | :--- | :--- |
| **New Note** | `Cmd + N` | `Ctrl + N` |
| **Search Notes** | `Cmd + F` | `Ctrl + F` |
| **Toggle Grid / List View** | `Cmd + Shift + L` | `Ctrl + Shift + L` |
| **View All Notes** | `Cmd + 1` | `Ctrl + 1` |
| **View Pinned Notes** | `Cmd + 2` | `Ctrl + 2` |
| **View Trash** | `Cmd + 3` | `Ctrl + 3` |
| **Open Settings** | `Cmd + ,` | `Ctrl + ,` |
| **Shortcuts Cheat Sheet** | `Cmd + /` | `Ctrl + /` |
| **Dismiss Modal / Blur** | `Escape` | `Escape` |

### Writing & Markdown Formatting
| Formatting | Hotkey / Markdown Trigger |
| :--- | :--- |
| **Bold** | `Cmd/Ctrl + B` |
| **Italic** | `Cmd/Ctrl + I` |
| **Underline** | `Cmd/Ctrl + U` |
| **Strikethrough** | `Cmd/Ctrl + Shift + X` |
| **Inline Code** | `Cmd/Ctrl + E` |
| **Heading 1 / 2 / 3** | `# ` / `## ` / `### ` + `Space` |
| **Checklist Item** | `[] ` or `- [ ] ` + `Space` |
| **Bullet List** | `- ` or `* ` + `Space` |
| **Numbered List** | `1. ` + `Space` |
| **Blockquote** | `> ` + `Space` |
| **Undo / Redo** | `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` |

### Organization & Export
| Action | macOS Shortcut | Windows / Linux Shortcut |
| :--- | :--- | :--- |
| **Pin / Unpin Active Note** | `Cmd + P` | `Ctrl + P` |
| **Move Note to Trash** | `Cmd + Shift + D` | `Ctrl + Shift + D` |
| **Export Note to Markdown** | `Cmd + Shift + M` | `Ctrl + Shift + M` |

## Tech Stack & Project Structure

### Core Technologies
- **Desktop Runtime**: [Tauri v2](https://tauri.app/) (Rust core, low memory footprint, native SQLite via `@tauri-apps/plugin-sql`)
- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/) with `@vitejs/plugin-react`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with native CSS variables and dark-mode adaptation
- **Rich-Text Engine**: [TipTap v3](https://tiptap.dev/) + ProseMirror ecosystem
- **Cloud Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Supabase Auth)
- **Icons**: [Lucide React](https://lucide.dev/) + Google Material Symbols
- **Testing**: [Vitest](https://vitest.dev/) (unit & integration testing)

### Directory Structure
```
noted/
├── index.html                  # HTML entry point with system fonts & styles
├── package.json                # Project dependencies, scripts, and engine specs
├── vite.config.ts              # Vite bundler configuration & Tailwind integration
├── tsconfig.json               # TypeScript compiler configuration
├── src/
│   ├── main.tsx                # React application entry point
│   ├── App.tsx                 # Main layout coordinator & keyboard listeners
│   ├── index.css               # Theme definitions & Tailwind root rules
│   ├── types/                  # TypeScript interfaces (Note, Collection, SyncQueueItem)
│   ├── components/
│   │   ├── editor/             # TipTap canvas, toolbar, bubble menu, slash command palette
│   │   ├── notes/              # Notes list/grid panel, note card, search bar
│   │   ├── collections/        # Folder/collection dialogs and selectors
│   │   ├── navigation/         # Sidebar, window header, mobile drawer, shortcuts modal
│   │   ├── settings/           # Preferences dialog (theme, view mode, sync, auth)
│   │   └── ui/                 # Shared iconography and base components
│   ├── lib/
│   │   ├── storage/            # Dual-adapter offline storage (SQLite + IndexedDB)
│   │   ├── export.ts           # Exporters for Markdown, HTML, and Plain Text
│   │   ├── markdownPaste.ts    # Smart clipboard parser converting Markdown to blocks
│   │   ├── noteClassifier.ts   # Structural heuristic classifier for notes
│   │   └── utils.ts            # Formatting helpers, word counters, UUID generators
│   └── services/
│       ├── noteService.ts      # Note lifecycle, mutations, and revision tracking
│       ├── collectionService.ts# Collection CRUD and relationship mappings
│       ├── searchService.ts    # Client-side full-text search with highlighting
│       ├── syncEngine.ts       # Offline queue coordinator & Supabase synchronizer
│       ├── authService.ts      # User sessions & authentication state
│       └── settingsService.ts  # Local preferences persistence
├── src-tauri/
│   ├── tauri.conf.json         # Tauri v2 bundle, window, and security permissions
│   ├── Cargo.toml              # Rust crate dependencies and plugins
│   └── src/main.rs             # Tauri application entry point
├── supabase/
│   └── migrations/             # SQL schema, tables, triggers, and RLS policies
└── tests/                      # 11 comprehensive Vitest test suites (57+ tests)
```

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Package Manager**: [pnpm](https://pnpm.io/) (preferred), `npm`, or `yarn`
- **Rust Toolchain** *(only required for desktop builds)*:
  - Install Rust via [rustup](https://rustup.rs/):
    ```bash
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```
  - Platform-specific Tauri prerequisites (C compiler, webkit2gtk on Linux):
    - Ubuntu / Debian:
      ```bash
      sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
      ```

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jayo14/noted.git
cd noted
pnpm install
```

### 2. Run in Web Development Mode
Starts the Vite dev server with Hot Module Replacement (HMR) at `http://localhost:1420`:
```bash
pnpm dev
```

### 3. Run as Native Desktop Application (Tauri v2)
Launches the native desktop window with live frontend reload and native SQLite bindings:
```bash
pnpm tauri dev
```

### 4. Build for Production
- **Web Production Assets**:
  ```bash
  pnpm build
  ```
  Generates optimized static output in `./dist`.

- **Desktop Release Binaries**:
  ```bash
  pnpm tauri build
  ```
  Bundles native installers (AppImage, `.deb`, `.dmg`, or `.msi` depending on OS) in `src-tauri/target/release/bundle`.

## Supabase Backend & Database Setup

Noted can be used 100% offline without any account or cloud dependency. When you are ready for cross-device synchronization, you can link any Supabase project in seconds.

### 1. Database Schema Migration
Run the initial migration against your Supabase PostgreSQL instance:
- **Via Supabase Dashboard**:
  Copy the contents of [`supabase/migrations/20261112000000_initial_schema.sql`](supabase/migrations/20261112000000_initial_schema.sql) and execute it in the **SQL Editor**.
- **Via Supabase CLI**:
  ```bash
  supabase db reset
  # or
  supabase migration up
  ```

### Schema Overview
The database migration provisions three tables secured with Row Level Security (RLS):
1. **`public.collections`**:
   - `id` (UUID), `user_id` (UUID FK to `auth.users`), `name` (TEXT), `created_at`, `updated_at`.
   - Strict RLS ensuring users can only read, insert, update, and delete their own collections.
2. **`public.notes`**:
   - `id` (UUID), `user_id` (UUID FK), `collection_id` (UUID FK optional), `title` (TEXT), `content` (JSONB), `is_pinned` (BOOLEAN), `revision` (BIGINT), `deleted_at` (TIMESTAMPTZ soft-delete), `created_at`, `updated_at`.
   - Automated triggers for `updated_at` timestamp management.
3. **`public.devices`**:
   - Tracks synced devices, device names, and `last_synced_at` heartbeats.

### 2. Connect Your App
Open **Settings** (`Cmd/Ctrl + ,`) inside Noted, navigate to the **Sync & Account** tab, and enter:
- **Supabase Project URL** (e.g. `https://your-project.supabase.co`)
- **Supabase Anon / Public Key**

Credentials are stored securely in your local database adapter, enabling instant session persistence and token auto-refresh.
