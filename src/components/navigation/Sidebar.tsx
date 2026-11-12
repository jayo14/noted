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
  onCreateCollection: (name: string) => Promise<void>;
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
  if (lower.includes("book") || lower.includes("read") || lower.includes("study")) return "school";
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
    <aside className="flex h-full w-[215px] flex-shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 text-[var(--text-primary)] select-none">
      <div className="flex flex-col gap-1">
        {/* Primary Navigation Sections */}
        <nav className="flex flex-col gap-0.5 pt-1">
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
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{allCount}</span>
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
            {pinnedCount > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">{pinnedCount}</span>
            )}
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
              <Icon name="inventory_2" size={17} className={isNavActive("archive") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
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
        <div className="mt-4 flex flex-col">
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[11.5px] font-semibold tracking-tight text-[var(--text-primary)]">
              Collections
            </span>
            <div className="flex items-center gap-1">
              {onImportFile && (
                <label
                  className="cursor-pointer rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Import note file"
                >
                  <Icon name="upload" size={15} />
                  <input
                    type="file"
                    accept=".md,.markdown,.txt,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onImportFile) onImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <button
                onClick={() => setIsCreatingCollection(true)}
                className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Create Collection"
              >
                <Icon name="add" size={16} />
              </button>
            </div>
          </div>

          {/* Inline creation input */}
          {isCreatingCollection && (
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSubmit();
                  if (e.key === "Escape") setIsCreatingCollection(false);
                }}
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--bg-editor)] px-2 py-1 text-xs outline-none"
              />
              <button
                onClick={handleCreateSubmit}
                className="rounded p-1 text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <Icon name="check" size={13} />
              </button>
              <button
                onClick={() => setIsCreatingCollection(false)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}

          {/* Collection Items */}
          <div className="mt-1 flex flex-col gap-0.5">
            {collections.map((col) => {
              const count = activeNotes.filter((n) => n.collection_id === col.id).length;
              const isSelected = activeSection === "collection" && activeCollectionId === col.id;
              const isEditing = editingCollectionId === col.id;
              const iconName = getCollectionIcon(col.name, col.icon);

              if (isEditing) {
                return (
                  <div key={col.id} className="flex items-center gap-1 px-2.5 py-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(col.id);
                        if (e.key === "Escape") setEditingCollectionId(null);
                      }}
                      className="w-full rounded border border-[var(--border-strong)] bg-[var(--bg-editor)] px-2 py-0.5 text-xs outline-none"
                    />
                    <button onClick={() => handleRenameSubmit(col.id)} className="rounded p-0.5">
                      <Icon name="check" size={13} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={col.id}
                  className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <button
                    onClick={() => onSelectSection("collection", col.id)}
                    className="flex flex-1 items-center gap-2.5 text-left truncate"
                  >
                    <Icon
                      name={iconName}
                      size={17}
                      className={isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                    />
                    <span className="text-[13px] truncate">{col.name}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:hidden">
                      {count}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setEditingCollectionId(col.id);
                          setEditingName(col.name);
                        }}
                        className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Rename"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteCollection(col.id)}
                        className="rounded p-0.5 text-[var(--text-muted)] hover:text-red-500"
                        title="Delete"
                      >
                        <Icon name="delete" size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Area: Synced Card & Settings */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Synced Card matching Image 1 */}
        <div
          onClick={onOpenSettings}
          className="flex cursor-pointer items-center justify-between rounded-xl bg-[var(--bg-surface)] p-2.5 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all shadow-2xs"
          title={currentUser ? `Signed in as ${currentUser.email}` : "Click to view sync status and configure account"}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-editor)] text-[var(--text-primary)] shadow-2xs">
              <Icon name="cloud_done" size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-[var(--text-primary)] leading-tight">
                Synced
              </span>
              <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                Just now
              </span>
            </div>
          </div>
          <Icon name="chevron_right" size={16} className="text-[var(--text-muted)]" />
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Icon name="settings" size={17} className="text-[var(--text-muted)]" />
          <span className="text-[13px]">Settings</span>
        </button>
      </div>
    </aside>
  );
};
