import React, { useState, useEffect } from "react";
import type { NavSection, Collection, Note, ThemePreference } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import { Icon } from "@/components/ui/Icon";

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

function getCollectionIcon(name: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const lower = name.toLowerCase();
  if (lower.includes("idea")) return "lightbulb";
  if (lower.includes("task") || lower.includes("todo")) return "check_box";
  if (lower.includes("work")) return "folder";
  if (lower.includes("personal") || lower.includes("life")) return "folder";
  if (lower.includes("study") || lower.includes("learn") || lower.includes("book")) return "school";
  if (lower.includes("travel") || lower.includes("trip")) return "flight";
  if (lower.includes("later") || lower.includes("wait")) return "schedule";
  return "folder";
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

  const handleSelect = (section: NavSection, colId: string | null = null) => {
    onSelectSection(section, colId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs">
      <div className="relative flex h-full w-72 flex-col justify-between bg-[var(--bg-sidebar)] p-4 shadow-2xl select-none">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#141312] text-white">
                <span className="text-xs font-bold leading-none">N</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                Notes
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
            >
              <Icon name="close" size={17} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-4 flex flex-col gap-1">
            <button
              onClick={() => handleSelect("all")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "all"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon name="description" size={17} className={activeSection === "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className="text-[13px]">All Notes</span>
              </div>
              <span className="text-[11px] font-medium text-[var(--text-muted)]">{allCount}</span>
            </button>

            <button
              onClick={() => handleSelect("pinned")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "pinned"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon name="push_pin" size={17} className={activeSection === "pinned" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className="text-[13px]">Pinned</span>
              </div>
              {pinnedCount > 0 && (
                <span className="text-[11px] font-medium text-[var(--text-muted)]">{pinnedCount}</span>
              )}
            </button>

            <button
              onClick={() => handleSelect("archive")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "archive"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon name="archive" size={17} className={activeSection === "archive" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className="text-[13px]">Archive</span>
              </div>
            </button>

            <button
              onClick={() => handleSelect("trash")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === "trash"
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon name="delete" size={17} className={activeSection === "trash" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className="text-[13px]">Trash</span>
              </div>
            </button>

            {/* Collections */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                <span>Collections</span>
                <button
                  onClick={() => setIsCreatingCol((prev) => !prev)}
                  className="flex h-5 w-5 items-center justify-center rounded hover:text-[var(--text-primary)]"
                  title="New Collection"
                >
                  <Icon name="add" size={15} />
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
                    className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none"
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
                    <Icon name="check" size={15} />
                  </button>
                </div>
              )}

              <div className="mt-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {collections.map((col) => {
                  const count = activeNotes.filter((n) => n.collection_id === col.id).length;
                  const isSelected = activeSection === "collection" && activeCollectionId === col.id;
                  const collIcon = getCollectionIcon(col.name, col.icon);
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleSelect("collection", col.id)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon name={collIcon} size={16} className={isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                        <span className="truncate text-[13px]">{col.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer: Theme, Settings */}
        <div className="border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-surface)] p-0.5">
              <button
                onClick={() => onThemeChange("light")}
                className={`rounded px-2 py-1 text-xs ${
                  theme === "light"
                    ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)]"
                }`}
                title="Light Theme"
              >
                <Icon name="light_mode" size={14} />
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={`rounded px-2 py-1 text-xs ${
                  theme === "dark"
                    ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)]"
                }`}
                title="Dark Theme"
              >
                <Icon name="dark_mode" size={14} />
              </button>
              <button
                onClick={() => onThemeChange("system")}
                className={`rounded px-2 py-1 text-xs ${
                  theme === "system"
                    ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)] shadow-2xs"
                    : "text-[var(--text-muted)]"
                }`}
                title="System Theme"
              >
                <Icon name="devices" size={14} />
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              title="Settings"
            >
              <Icon name="settings" size={18} />
            </button>
          </div>

          {currentUser && (
            <p className="mt-2 truncate px-1 text-[11px] text-[var(--text-muted)]">
              {currentUser.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
