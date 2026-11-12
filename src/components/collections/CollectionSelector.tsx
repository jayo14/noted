import React, { useState, useRef, useEffect } from "react";
import type { Collection } from "@/types";
import { Folder, Check, Plus, FolderMinus } from "lucide-react";

interface CollectionSelectorProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onCreateCollection?: (name: string) => Promise<void>;
}

export const CollectionSelector: React.FC<CollectionSelectorProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCollection = collections.find((c) => c.id === selectedCollectionId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (newColName.trim() && onCreateCollection) {
      await onCreateCollection(newColName.trim());
      setNewColName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
        title="Move to collection"
      >
        <Folder size={13} />
        <span className="max-w-[100px] truncate">
          {activeCollection ? activeCollection.name : "No Collection"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-48 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-lg text-xs">
          <button
            onClick={() => {
              onSelectCollection(null);
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
          >
            <div className="flex items-center gap-2">
              <FolderMinus size={13} />
              <span>No Collection</span>
            </div>
            {selectedCollectionId === null && <Check size={12} />}
          </button>

          <div className="my-1 h-px bg-[var(--border-subtle)]" />

          <div className="max-h-36 overflow-y-auto">
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  onSelectCollection(col.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder size={13} className="flex-shrink-0" />
                  <span className="truncate">{col.name}</span>
                </div>
                {selectedCollectionId === col.id && <Check size={12} />}
              </button>
            ))}
          </div>

          {onCreateCollection && (
            <>
              <div className="my-1 h-px bg-[var(--border-subtle)]" />
              {isCreating ? (
                <div className="flex items-center gap-1 p-1">
                  <input
                    type="text"
                    placeholder="New collection..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setIsCreating(false);
                    }}
                    autoFocus
                    className="w-full rounded bg-[var(--bg-app)] px-2 py-1 text-xs outline-none border border-[var(--border-strong)] text-[var(--text-primary)]"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                >
                  <Plus size={12} />
                  <span>Create collection</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
