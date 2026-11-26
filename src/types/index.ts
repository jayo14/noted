import type { JSONContent } from "@tiptap/core";

export type NoteId = string;
export type CollectionId = string;
export type UserId = string;

export interface Note {
  id: NoteId;
  user_id: UserId;
  title: string;
  content: JSONContent;
  collection_id: CollectionId | null;
  is_pinned: boolean;
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
}

export interface Collection {
  id: CollectionId;
  user_id: UserId;
  name: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export type SyncOperation = "insert" | "update" | "delete";

export type SyncStatus = "pending" | "processing" | "completed" | "failed";

export interface SyncQueueItem {
  id: string;
  entity_type: "note" | "collection";
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncStatus;
  created_at: string;
  retries: number;
  last_error?: string | null;
}

export interface DeviceInfo {
  id: string;
  user_id: UserId;
  device_name: string;
  last_synced_at: string | null;
}

export type ThemePreference = "light" | "dark" | "system";

export type NavSection = "all" | "pinned" | "today" | "archive" | "collection" | "trash" | "clipboard" | "settings" | "hidden";

export type ClipboardContentType = "text" | "html" | "image";

export type ClipboardCategory =
  | "text"
  | "rich_text"
  | "image"
  | "url"
  | "email"
  | "color"
  | "command"
  | "code";

export interface ClipboardItem {
  id: string;
  content_type: ClipboardContentType;
  content_text: string;
  content_html: string | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  content_hash: string;
  category: ClipboardCategory;
  is_pinned: boolean;
  created_at: string;
  last_copied_at: string;
}

export type SortOption = "updated" | "created" | "title";

export interface FilterState {
  section: NavSection;
  collectionId: CollectionId | null;
  searchQuery: string;
  sortBy?: SortOption;
  onlyChecklists?: boolean;
}

export interface NoteStats {
  words: number;
  characters: number;
  readingTimeMinutes: number;
}
