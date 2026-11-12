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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
}

export interface Collection {
  id: CollectionId;
  user_id: UserId;
  name: string;
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

export type NavSection = "all" | "pinned" | "collection" | "trash" | "settings";

export interface FilterState {
  section: NavSection;
  collectionId: CollectionId | null;
  searchQuery: string;
}

export interface NoteStats {
  words: number;
  characters: number;
  readingTimeMinutes: number;
}
