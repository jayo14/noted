import React, { useState, useEffect } from "react";
import type { NavSection, Collection, Note } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import { Icon } from "@/components/ui/Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
  if (lower.includes("work") || lower.includes("office")) return "folder";
  if (lower.includes("task") || lower.includes("todo")) return "check_box";
  if (lower.includes("personal") || lower.includes("life")) return "folder";
  if (lower.includes("project")) return "folder";
  if (lower.includes("later") || lower.includes("wait") || lower.includes("time")) return "schedule";
  if (lower.includes("book") || lower.includes("read") || lower.includes("study") || lower.includes("learn")) return "school";
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
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);

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

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {}
  };

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch {}
  };

  return (
    <aside className="flex h-full w-[215px] flex-shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 text-[var(--text-primary)] select-none">
      <div className="flex flex-col gap-1">
        {/* macOS Traffic Lights + App Title */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-3 px-1 pt-1 pb-3.5"
        >
          {/* Traffic Lights */}
          <div
            className="flex items-center gap-2 group/traffic py-1 cursor-pointer"
            onMouseEnter={() => setIsTrafficHovered(true)}
            onMouseLeave={() => setIsTrafficHovered(false)}
          >
            {/* Red: Close */}
            <button
              onClick={handleClose}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F56] border border-[#E0443E] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              title="Close"
              aria-label="Close"
            >
              <svg
                className={`h-1.5 w-1.5 text-[#4D0000] transition-opacity ${
                  isTrafficHovered ? "opacity-100" : "opacity-0"
                }`}
                viewBox="0 0 24 24"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Yellow: Minimize */}
            <button
              onClick={handleMinimize}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-[#FFBD2E] border border-[#DEA123] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              title="Minimize"
              aria-label="Minimize"
            >
              <svg
                className={`h-1.5 w-1.5 text-[#664D00] transition-opacity ${
                  isTrafficHovered ? "opacity-100" : "opacity-0"
                }`}
                viewBox="0 0 24 24"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Green: Maximize */}
            <button
              onClick={handleMaximize}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-[#27C93F] border border-[#1AAB29] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              title="Maximize"
              aria-label="Maximize"
            >
              <svg
                className={`h-1.5 w-1.5 text-[#004D11] transition-opacity ${
                  isTrafficHovered ? "opacity-100" : "opacity-0"
                }`}
                viewBox="0 0 24 24"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
              </svg>
            </button>
          </div>

          {/* Brand Icon & Name */}
          <div className="flex items-center gap-2 ml-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#141312] text-white shadow-2xs">
              <span className="text-[10px] font-bold tracking-tighter leading-none">N</span>
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
              Notes
            </span>
          </div>
        </div>

        {/* Primary Navigation Sections */}
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
              <Icon name="description" size={16} className={isNavActive("all") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
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
              <Icon name="push_pin" size={16} className={isNavActive("pinned") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Pinned</span>
            </div>
            {pinnedCount > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">{pinnedCount}</span>
            )}
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
              <Icon name="archive" size={16} className={isNavActive("archive") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
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
              <Icon name="delete" size={16} className={isNavActive("trash") ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              <span className="text-[13px]">Trash</span>
            </div>
          </button>
        </nav>

        {/* Collections Section */}
        <div className="mt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[11px] font-medium tracking-tight text-[var(--text-muted)]">
              Collections
            </span>
            <button
              onClick={() => setIsCreatingCollection(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
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
                          size={16}
                          className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                        />
                        <span className="truncate text-[13px]">{coll.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--text-muted)]">
                          {count}
                        </span>
                        {/* More actions button (rename/delete) visible on hover */}
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

      {/* Sidebar Footer: Synced Status + Settings Button */}
      <div className="flex flex-col gap-1.5 pt-2">
        {/* Synced Status Badge matching Apple Notes */}
        <div className="flex items-center justify-between px-2.5 py-1 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Icon name="sync" size={15} className="text-[var(--text-muted)]" />
            <span className="text-[11.5px] font-medium">Synced just now</span>
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Settings"
            aria-label="Settings"
          >
            <Icon name="settings" size={16} />
          </button>
        </div>

        {/* User Account / Import row if logged in */}
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
