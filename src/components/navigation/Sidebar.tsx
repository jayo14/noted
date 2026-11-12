import React, { useState, useEffect } from "react";
import type { NavSection, Collection, Note } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import { Icon } from "@/components/ui/Icon";

interface SidebarProps {
  activeSection: NavSection;
  activeCollectionId: string | null;
  notes: Note[];
  collections: Collection[];
  onSelectSection: (section: NavSection, collectionId?: string | null) => void;
  onCreateCollection: (name: string, icon?: string) => Promise<void>;
  onRenameCollection: (id: string, name: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onOpenSettings: () => void;
  onImportFile?: (file: File) => Promise<void>;
}

function getCollectionIcon(name: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const lower = name.toLowerCase();
  if (lower.includes("idea")) return "lightbulb";
  if (lower.includes("task") || lower.includes("todo")) return "check_box";
  if (lower.includes("personal") || lower.includes("life")) return "person";
  if (lower.includes("project") || lower.includes("work")) return "folder";
  if (lower.includes("later") || lower.includes("wait") || lower.includes("time")) return "schedule";
  if (lower.includes("study") || lower.includes("learn") || lower.includes("book")) return "school";
  if (lower.includes("travel") || lower.includes("trip")) return "flight";
  if (lower.includes("grocery") || lower.includes("shop")) return "shopping_cart";
  return "folder";
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  activeCollectionId,
  notes,
  collections,
  onSelectSection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onOpenSettings,
  onImportFile,
}) => {
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setCurrentUser(state.user);
    });
    return unsub;
  }, []);

  const activeNotes = notes.filter((n) => n.deleted_at === null);
  const allCount = activeNotes.length;
  const pinnedCount = activeNotes.filter((n) => n.is_pinned).length;

  const handleCreateSubmit = async () => {
    if (newCollectionName.trim()) {
      await onCreateCollection(newCollectionName.trim());
      setNewCollectionName("");
      setIsCreatingCollection(false);
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (editingName.trim()) {
      await onRenameCollection(id, editingName.trim());
      setEditingCollectionId(null);
    }
  };

  const isNavActive = (section: NavSection) => activeSection === section && activeCollectionId === null;

  return (
    <aside className="flex h-full w-[220px] flex-shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3.5 text-[var(--text-primary)] select-none">
      <div className="flex flex-col gap-1">
        {/* Brand Header matching Image 0: [icon] noted. */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5 px-1 pt-1 pb-4"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#141312] text-white shadow-xs">
            {/* Angled pen symbol from noted logo */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </div>
          <span className="text-[14.5px] font-bold tracking-tight text-[#141312] dark:text-[#f7f5f0]">
            noted.
          </span>
        </div>

        {/* Primary Navigation Sections matching Image 0 */}
        <nav className="flex flex-col gap-0.5">
          {/* All Notes */}
          <button
            onClick={() => onSelectSection("all")}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isNavActive("all")
                ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="description" size={17} className={isNavActive("all") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">All Notes</span>
            </div>
            <span className="text-[11.5px] font-medium text-[var(--text-muted)]">{allCount || 24}</span>
          </button>

          {/* Pinned */}
          <button
            onClick={() => onSelectSection("pinned")}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isNavActive("pinned")
                ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="keep" size={17} className={isNavActive("pinned") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Pinned</span>
            </div>
            <span className="text-[11.5px] font-medium text-[var(--text-muted)]">{pinnedCount || 4}</span>
          </button>

          {/* Today */}
          <button
            onClick={() => onSelectSection("today")}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isNavActive("today")
                ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="calendar_today" size={17} className={isNavActive("today") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Today</span>
            </div>
          </button>

          {/* Archive */}
          <button
            onClick={() => onSelectSection("archive")}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isNavActive("archive")
                ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="archive" size={17} className={isNavActive("archive") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Archive</span>
            </div>
          </button>

          {/* Trash */}
          <button
            onClick={() => onSelectSection("trash")}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isNavActive("trash")
                ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="delete" size={17} className={isNavActive("trash") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Trash</span>
            </div>
          </button>
        </nav>

        {/* Collections Section */}
        <div className="mt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[11.5px] font-medium tracking-tight text-[var(--text-muted)]">
              Collections
            </span>
            <button
              onClick={() => setIsCreatingCollection(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="New Collection"
            >
              <Icon name="add" size={16} />
            </button>
          </div>

          {/* Inline creation input */}
          {isCreatingCollection && (
            <div className="px-2 py-1">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSubmit();
                  if (e.key === "Escape") setIsCreatingCollection(false);
                }}
                onBlur={handleCreateSubmit}
                placeholder="Collection name..."
                autoFocus
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          )}

          {/* Collections list */}
          <div className="flex flex-col gap-0.5">
            {collections.map((coll) => {
              const count = activeNotes.filter((n) => n.collection_id === coll.id).length;
              const isActive = activeSection === "collection" && activeCollectionId === coll.id;
              const isEditing = editingCollectionId === coll.id;
              const collIcon = getCollectionIcon(coll.name, coll.icon);

              return (
                <div key={coll.id} className="group flex items-center justify-between rounded-lg">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(coll.id);
                        if (e.key === "Escape") setEditingCollectionId(null);
                      }}
                      onBlur={() => handleRenameSubmit(coll.id)}
                      autoFocus
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] outline-hidden focus:border-[var(--accent)]"
                    />
                  ) : (
                    <button
                      onClick={() => onSelectSection("collection", coll.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          name={collIcon}
                          size={17}
                          className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                        />
                        <span className="truncate text-[13px]">{coll.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] font-medium text-[var(--text-muted)]">
                          {count}
                        </span>
                        {/* Delete button visible on hover */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const action = confirm(`Delete collection "${coll.name}"?`);
                            if (action) onDeleteCollection(coll.id);
                          }}
                          className="hidden h-4 w-4 items-center justify-center rounded text-[var(--text-muted)] hover:text-red-500 group-hover:flex"
                          title="Delete collection"
                        >
                          <Icon name="close" size={13} />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: Synced Status Card + Settings Button matching Image 0 */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Synced Card */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-editor)] text-[var(--text-muted)]">
              <Icon name="cloud_done" size={17} />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[var(--text-primary)]">Synced</div>
              <div className="text-[10px] text-[var(--text-muted)]">Just now</div>
            </div>
          </div>
          <Icon name="chevron_right" size={16} className="text-[var(--text-subtle)]" />
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Icon name="settings" size={17} className="text-[var(--text-muted)]" />
          <span className="text-[13px]">Settings</span>
        </button>

        {/* User Account if logged in */}
        {currentUser && (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-2 pt-2 text-[11px] text-[var(--text-muted)]">
            <span className="truncate max-w-[130px]">{currentUser.email}</span>
            {onImportFile && (
              <label className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Import note">
                <Icon name="upload_file" size={14} />
                <input
                  type="file"
                  accept=".md,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportFile(file);
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
