import React, { useState, useEffect } from "react";
import type { NavSection, Collection, Note, ThemePreference } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import {
  FileText,
  Pin,
  Folder,
  Trash2,
  Settings,
  X,
  Plus,
  Check,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: NavSection;
  activeCollectionId: string | null;
  notes: Note[];
  collections: Collection[];
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onSelectSection: (section: NavSection, collectionId?: string | null) => void;
  onCreateCollection: (name: string) => Promise<void>;
  onOpenSettings: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  activeCollectionId,
  notes,
  collections,
  theme,
  onThemeChange,
  onSelectSection,
  onCreateCollection,
  onOpenSettings,
}) => {
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setCurrentUser(state.user);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const activeNotes = notes.filter((n) => n.deleted_at === null);
  const allCount = activeNotes.length;
  const pinnedCount = activeNotes.filter((n) => n.is_pinned).length;
  const trashCount = notes.filter((n) => n.deleted_at !== null).length;

  const handleSelect = (section: NavSection, colId: string | null = null) => {
    onSelectSection(section, colId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs">
      <div className="relative flex h-full w-72 flex-col justify-between bg-[var(--bg-surface)] p-4 shadow-xl">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[var(--accent)] flex items-center justify-center text-[var(--accent-contrast)] text-xs font-bold">
                N
              </div>
              <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                Noted
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-4 flex flex-col gap-1">
            <button
              onClick={() => handleSelect("all")}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "all"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={15} />
                <span>All Notes</span>
              </div>
              <span className="text-[11px] text-[var(--text-subtle)]">{allCount}</span>
            </button>

            <button
              onClick={() => handleSelect("pinned")}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "pinned"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Pin size={15} />
                <span>Pinned</span>
              </div>
              <span className="text-[11px] text-[var(--text-subtle)]">{pinnedCount}</span>
            </button>

            {/* Collections */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] tracking-wider">
                <span>COLLECTIONS</span>
                <button
                  onClick={() => setIsCreatingCol((prev) => !prev)}
                  className="rounded p-0.5 hover:text-[var(--text-primary)]"
                  title="New Collection"
                >
                  <Plus size={13} />
                </button>
              </div>

              {isCreatingCol && (
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Collection name..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newColName.trim()) {
                        await onCreateCollection(newColName.trim());
                        setNewColName("");
                        setIsCreatingCol(false);
                      } else if (e.key === "Escape") {
                        setIsCreatingCol(false);
                      }
                    }}
                    className="flex-1 rounded border border-[var(--border-strong)] bg-[var(--bg-app)] px-2 py-1 text-xs outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (newColName.trim()) {
                        await onCreateCollection(newColName.trim());
                        setNewColName("");
                        setIsCreatingCol(false);
                      }
                    }}
                    className="rounded p-1 text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
                  >
                    <Check size={13} />
                  </button>
                </div>
              )}

              <div className="mt-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {collections.map((col) => {
                  const count = activeNotes.filter((n) => n.collection_id === col.id).length;
                  const isSelected = activeSection === "collection" && activeCollectionId === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleSelect("collection", col.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder size={14} className="flex-shrink-0" />
                        <span className="truncate">{col.name}</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-subtle)]">{count}</span>
                    </button>
                  );
                })}
                {collections.length === 0 && (
                  <p className="px-3 py-1.5 text-xs text-[var(--text-subtle)] italic">
                    No collections yet
                  </p>
                )}
              </div>
            </div>

            {/* Trash */}
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
              <button
                onClick={() => handleSelect("trash")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeSection === "trash"
                    ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 size={15} />
                  <span>Trash</span>
                </div>
                <span className="text-[11px] text-[var(--text-subtle)]">{trashCount}</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Footer: Theme toggles and Settings button */}
        <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[var(--text-muted)]">Theme</span>
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-0.5">
              <button
                onClick={() => onThemeChange("light")}
                className={`rounded p-1 text-xs ${
                  theme === "light"
                    ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-subtle)]"
                }`}
              >
                <Sun size={13} />
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={`rounded p-1 text-xs ${
                  theme === "dark"
                    ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-subtle)]"
                }`}
              >
                <Moon size={13} />
              </button>
              <button
                onClick={() => onThemeChange("system")}
                className={`rounded p-1 text-xs ${
                  theme === "system"
                    ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-subtle)]"
                }`}
              >
                <Monitor size={13} />
              </button>
            </div>
          </div>

          <div
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-app)] border border-[var(--border-subtle)]"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  currentUser ? "bg-green-500" : "bg-[var(--text-subtle)]"
                }`}
              />
              <span className="truncate">
                {currentUser?.email ? currentUser.email.split("@")[0] : "Local Storage"}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {currentUser ? "Cloud Sync" : "Offline"}
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Settings size={15} />
            <span>Settings & Sync</span>
          </button>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
