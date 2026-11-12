import React, { useState } from "react";
import type { NavSection, Collection, Note } from "@/types";
import {
  FileText,
  Pin,
  Folder,
  Trash2,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
} from "lucide-react";

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
}) => {
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activeNotes = notes.filter((n) => n.deleted_at === null);
  const allCount = activeNotes.length;
  const pinnedCount = activeNotes.filter((n) => n.is_pinned).length;
  const trashCount = notes.filter((n) => n.deleted_at !== null).length;

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

  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
      {/* Top Header & Core Nav */}
      <div className="flex flex-col p-3">
        {/* Brand / App Title */}
        <div className="mb-4 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-[var(--accent)] flex items-center justify-center text-[var(--accent-contrast)] text-xs font-bold">
              N
            </div>
            <span className="text-sm font-semibold tracking-tight">Noted</span>
          </div>
        </div>

        {/* Primary Sections */}
        <nav className="flex flex-col gap-0.5">
          {/* All Notes */}
          <button
            onClick={() => onSelectSection("all")}
            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeSection === "all"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={14} />
              <span>All Notes</span>
            </div>
            <span className="text-[11px] text-[var(--text-subtle)]">{allCount}</span>
          </button>

          {/* Pinned */}
          <button
            onClick={() => onSelectSection("pinned")}
            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeSection === "pinned"
                ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Pin size={14} />
              <span>Pinned</span>
            </div>
            <span className="text-[11px] text-[var(--text-subtle)]">{pinnedCount}</span>
          </button>

          {/* Collections Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-[var(--text-subtle)]">
              <button
                onClick={() => setIsCollectionsOpen(!isCollectionsOpen)}
                className="flex items-center gap-1 hover:text-[var(--text-primary)]"
              >
                {isCollectionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>COLLECTIONS</span>
              </button>
              <button
                onClick={() => setIsCreatingCollection(true)}
                className="rounded p-0.5 hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                title="New Collection"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Create Collection Input */}
            {isCreatingCollection && (
              <div className="mt-1 flex items-center gap-1 px-2 py-1">
                <input
                  type="text"
                  placeholder="Collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSubmit();
                    if (e.key === "Escape") setIsCreatingCollection(false);
                  }}
                  autoFocus
                  className="w-full rounded bg-[var(--bg-app)] px-2 py-1 text-xs outline-none border border-[var(--border-strong)] text-[var(--text-primary)]"
                />
                <button
                  onClick={handleCreateSubmit}
                  className="text-[var(--text-primary)] hover:opacity-80"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setIsCreatingCollection(false)}
                  className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Collections List */}
            {isCollectionsOpen && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {collections.map((col) => {
                  const count = activeNotes.filter((n) => n.collection_id === col.id).length;
                  const isSelected = activeSection === "collection" && activeCollectionId === col.id;

                  if (editingCollectionId === col.id) {
                    return (
                      <div key={col.id} className="flex items-center gap-1 px-2 py-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(col.id);
                            if (e.key === "Escape") setEditingCollectionId(null);
                          }}
                          autoFocus
                          className="w-full rounded bg-[var(--bg-app)] px-2 py-0.5 text-xs outline-none border border-[var(--border-strong)] text-[var(--text-primary)]"
                        />
                        <button
                          onClick={() => handleRenameSubmit(col.id)}
                          className="text-[var(--text-primary)]"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingCollectionId(null)}
                          className="text-[var(--text-subtle)]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={col.id}
                      className={`group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <button
                        onClick={() => onSelectSection("collection", col.id)}
                        className="flex flex-1 items-center gap-2 truncate text-left"
                      >
                        <Folder size={14} className="flex-shrink-0" />
                        <span className="truncate">{col.name}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[var(--text-subtle)] group-hover:hidden">
                          {count}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCollectionId(col.id);
                              setEditingName(col.name);
                            }}
                            className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
                            title="Rename"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCollection(col.id);
                            }}
                            className="text-[var(--text-subtle)] hover:text-red-500"
                            title="Delete collection"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {collections.length === 0 && !isCreatingCollection && (
                  <p className="px-3 py-1 text-[11px] text-[var(--text-subtle)] italic">
                    No collections yet
                  </p>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom Nav: Trash & Settings */}
      <div className="flex flex-col border-t border-[var(--border-subtle)] p-3 gap-0.5">
        <button
          onClick={() => onSelectSection("trash")}
          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeSection === "trash"
              ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 size={14} />
            <span>Trash</span>
          </div>
          <span className="text-[11px] text-[var(--text-subtle)]">{trashCount}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
