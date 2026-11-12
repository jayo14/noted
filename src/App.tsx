import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Note, Collection, NavSection, FilterState, ThemePreference, NoteStats } from "@/types";
import { noteService } from "@/services/noteService";
import { collectionService } from "@/services/collectionService";
import { syncEngine } from "@/services/syncEngine";
import { authService } from "@/services/authService";
import { getStorageAdapter } from "@/lib/storage";
import { Sidebar } from "@/components/navigation/Sidebar";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { ShortcutsModal } from "@/components/navigation/ShortcutsModal";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { Editor } from "@/components/editor/Editor";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { extractTextFromJSONContent } from "@/lib/utils";
import { exportNoteAsFile, jsonContentToMarkdown, parseImportFile } from "@/lib/export";
import { ShareModal } from "@/components/editor/ShareModal";
import { Menu } from "lucide-react";

export function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    section: "all",
    collectionId: null,
    searchQuery: "",
  });

  const [theme, setTheme] = useState<ThemePreference>("system");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [mobileScreen, setMobileScreen] = useState<"notes" | "editor">("notes");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Track window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // System
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      if (media.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme]);

  // Initial data load
  const loadInitialData = useCallback(async () => {
    try {
      let [loadedNotes, loadedCollections] = await Promise.all([
        noteService.getAllNotes(true),
        collectionService.getCollections(),
      ]);

      if (loadedCollections.length === 0) {
        const seedCollectionsData = [
          { name: "Personal", icon: "folder" },
          { name: "Work", icon: "folder" },
          { name: "Ideas", icon: "lightbulb" },
          { name: "Learning", icon: "school" },
          { name: "Travel", icon: "flight" },
        ];
        const createdCols: Collection[] = [];
        for (const col of seedCollectionsData) {
          const created = await collectionService.createCollection(col.name, col.icon);
          createdCols.push(created);
        }
        loadedCollections = createdCols;
        setCollections(createdCols);
      } else {
        setCollections(loadedCollections);
      }

      if (loadedNotes.length === 0) {
        const workCol = loadedCollections.find((c) => c.name === "Work")?.id || null;
        const personalCol = loadedCollections.find((c) => c.name === "Personal")?.id || null;
        const ideasCol = loadedCollections.find((c) => c.name === "Ideas")?.id || null;
        const learningCol = loadedCollections.find((c) => c.name === "Learning")?.id || null;
        const travelCol = loadedCollections.find((c) => c.name === "Travel")?.id || null;

        // Note 1: Project roadmap (Pinned, Active)
        const noteRoadmap = await noteService.createNote(workCol, "Project roadmap");
        noteRoadmap.is_pinned = true;
        noteRoadmap.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Here are the key milestones for the next quarter:" }],
            },
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Finalize the core experience" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Improve synchronisation reliability" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Add theme customisation" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Prepare for mobile release" }] }],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Notes" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Keep the interface minimal and focused" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Make synchronisation completely seamless" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Ensure the editor feels great on both desktop and mobile" }] }],
                },
              ],
            },
            {
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "A great notes app should disappear, letting you focus on what matters: your thoughts." }],
                },
              ],
            },
          ],
        };
        await noteService.updateNote(noteRoadmap.id, { content: noteRoadmap.content, is_pinned: true });

        // Note 2: Weekend plans
        const noteWeekend = await noteService.createNote(personalCol, "Weekend plans");
        noteWeekend.content = {
          type: "doc",
          content: [
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Hike in the mountains" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Try that new coffee place" }] }],
                },
              ],
            },
          ],
        };
        await noteService.updateNote(noteWeekend.id, { content: noteWeekend.content });

        // Note 3: Book recommendations
        const noteBooks = await noteService.createNote(learningCol, "Book recommendations");
        noteBooks.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Some great books I want to read..." }],
            },
          ],
        };
        await noteService.updateNote(noteBooks.id, { content: noteBooks.content });

        // Note 4: Study notes — Machine Learning
        const noteStudy = await noteService.createNote(learningCol, "Study notes — Machine Learning");
        noteStudy.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Key concepts: overfitting, regularisation..." }],
            },
          ],
        };
        await noteService.updateNote(noteStudy.id, { content: noteStudy.content });

        // Note 5: Grocery list
        const noteGrocery = await noteService.createNote(personalCol, "Grocery list");
        noteGrocery.content = {
          type: "doc",
          content: [
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Milk" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Eggs" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Bread" }] }],
                },
              ],
            },
          ],
        };
        await noteService.updateNote(noteGrocery.id, { content: noteGrocery.content });

        // Note 6: Ideas for the app
        const noteIdeas = await noteService.createNote(ideasCol, "Ideas for the app");
        noteIdeas.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Maybe add a distraction-free mode?" }],
            },
          ],
        };
        await noteService.updateNote(noteIdeas.id, { content: noteIdeas.content });

        // Note 7: Travel wishlist
        const noteTravel = await noteService.createNote(travelCol, "Travel wishlist");
        noteTravel.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Japan, Iceland, New Zealand..." }],
            },
          ],
        };
        await noteService.updateNote(noteTravel.id, { content: noteTravel.content });

        const allSeedNotes = [
          noteRoadmap,
          noteWeekend,
          noteBooks,
          noteStudy,
          noteGrocery,
          noteIdeas,
          noteTravel,
        ];
        setNotes(allSeedNotes);
        setSelectedNoteId(noteRoadmap.id);
      } else {
        setNotes(loadedNotes);
        const active = loadedNotes.filter((n) => n.deleted_at === null);
        if (active.length > 0) {
          setSelectedNoteId(active[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Initialize sync engine & settings
    (async () => {
      const storage = await getStorageAdapter();
      const savedTheme = await storage.getSetting<ThemePreference>("theme", "system");
      setTheme(savedTheme);

      const savedUrl = await storage.getSetting<string>("supabase_url", "");
      const savedKey = await storage.getSetting<string>("supabase_key", "");
      setSupabaseUrl(savedUrl);
      setSupabaseKey(savedKey);

      await syncEngine.init(savedUrl, savedKey);
      await authService.init(savedUrl, savedKey);
      const queue = await storage.getPendingSyncQueue();
      setPendingSyncCount(queue.length);
    })();

    const unsubSync = syncEngine.subscribe((status) => {
      setLastSyncedAt(status.lastSyncedAt);
    });

    const stopSync = syncEngine.startPeriodicSync(30000);

    return () => {
      unsubSync();
      stopSync();
    };
  }, [loadInitialData]);

  // Currently selected note
  const currentNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Handlers
  const handleCreateNote = async () => {
    const targetCollectionId = filter.section === "collection" ? filter.collectionId : null;
    const newNote = await noteService.createNote(targetCollectionId);
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    if (isMobile) {
      setMobileScreen("editor");
    }
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    if (isMobile) {
      setMobileScreen("editor");
    }
  };

  const handleSaveNote = useCallback(
    async (newTitle: string, newContent: Note["content"], _stats: NoteStats) => {
      if (!selectedNoteId) return;

      const updated = await noteService.updateNote(selectedNoteId, {
        title: newTitle,
        content: newContent,
      });

      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }
    },
    [selectedNoteId],
  );

  const handleTogglePin = async () => {
    if (!selectedNoteId) return;
    const updated = await noteService.togglePin(selectedNoteId);
    if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  };

  const handleDeleteCurrentNote = async () => {
    if (!selectedNoteId) return;
    await noteService.softDeleteNote(selectedNoteId);
    const updatedNotes = await noteService.getAllNotes(true);
    setNotes(updatedNotes);

    const active = updatedNotes.filter((n) => n.deleted_at === null);
    if (active.length > 0) {
      setSelectedNoteId(active[0].id);
    } else {
      setSelectedNoteId(null);
    }
    if (isMobile) {
      setMobileScreen("notes");
    }
  };

  const handleDuplicateNote = async () => {
    if (!selectedNoteId) return;
    const duplicated = await noteService.duplicateNote(selectedNoteId);
    if (duplicated) {
      setNotes((prev) => [duplicated, ...prev]);
      setSelectedNoteId(duplicated.id);
    }
  };

  const handleMoveCurrentNoteToCollection = async (collectionId: string | null) => {
    if (!selectedNoteId) return;
    const updated = await noteService.moveToCollection(selectedNoteId, collectionId);
    if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  };

  const handleRestoreCurrentNote = async () => {
    if (!selectedNoteId) return;
    const restored = await noteService.restoreNote(selectedNoteId);
    if (restored) {
      const updatedNotes = await noteService.getAllNotes(true);
      setNotes(updatedNotes);
    }
  };

  const handleEmptyTrash = async () => {
    await noteService.emptyTrash();
    const updatedNotes = await noteService.getAllNotes(true);
    setNotes(updatedNotes);
    setSelectedNoteId(null);
  };

  const handleCreateCollection = async (name: string) => {
    const col = await collectionService.createCollection(name);
    setCollections((prev) => [...prev, col]);
    setFilter((prev) => ({ ...prev, section: "collection", collectionId: col.id }));
  };

  const handleRenameCollection = async (id: string, name: string) => {
    const updated = await collectionService.renameCollection(id, name);
    if (updated) {
      setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  };

  const handleDeleteCollection = async (id: string) => {
    await collectionService.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (filter.collectionId === id) {
      setFilter((prev) => ({ ...prev, section: "all", collectionId: null }));
    }
    // Refresh notes because collection_id unset
    const updatedNotes = await noteService.getAllNotes(true);
    setNotes(updatedNotes);
  };

  // Export handlers
  const handleExportNote = () => {
    if (!currentNote) return;
    exportNoteAsFile(currentNote, "markdown");
  };

  const handleExportAll = (format: "markdown" | "json") => {
    const active = notes.filter((n) => n.deleted_at === null);
    if (format === "json") {
      const blob = new Blob([JSON.stringify(active, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noted-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const combined = active
        .map((n) => `# ${n.title}\n\n${jsonContentToMarkdown(n.content)}\n\n---\n`)
        .join("\n");
      const blob = new Blob([combined], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noted-export-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const { title, content } = await parseImportFile(file);
      const targetCollectionId = filter.section === "collection" ? filter.collectionId : null;
      const newNote = await noteService.createNote(targetCollectionId, title);
      const updated = await noteService.updateNote(newNote.id, { content });
      if (updated) {
        setNotes((prev) => [updated, ...prev]);
        setSelectedNoteId(updated.id);
      } else {
        setNotes((prev) => [newNote, ...prev]);
        setSelectedNoteId(newNote.id);
      }
      if (isMobile) {
        setMobileScreen("editor");
      }
    } catch (err) {
      console.error("Failed to import file:", err);
    }
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleCreateNote();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleTogglePin();
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDeleteCurrentNote();
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        handleExportNote();
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      } else if (isCmdOrCtrl && (e.key === "," || (e.shiftKey && e.key.toLowerCase() === "s"))) {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key === "/") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key === "1") {
        e.preventDefault();
        setFilter((prev) => ({ ...prev, section: "all", collectionId: null }));
      } else if (isCmdOrCtrl && e.key === "2") {
        e.preventDefault();
        setFilter((prev) => ({ ...prev, section: "pinned", collectionId: null }));
      } else if (isCmdOrCtrl && e.key === "3") {
        e.preventDefault();
        setFilter((prev) => ({ ...prev, section: "trash", collectionId: null }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentNote]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#E2ded5] dark:bg-[#121110] text-[var(--text-primary)] antialiased select-none items-center justify-center p-0 md:p-3 lg:p-4">
      {/* macOS Window Frame Container */}
      <div className="flex h-full w-full max-w-[1440px] overflow-hidden rounded-none md:rounded-[18px] border-0 md:border border-black/[0.08] dark:border-white/[0.08] bg-[var(--bg-window)] shadow-none md:shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        {/* Desktop 3-pane layout */}
        {!isMobile ? (
          <div className="flex h-full w-full">
          {/* Pane 1: Navigation Sidebar */}
          {!isZenMode && (
            <Sidebar
              activeSection={filter.section}
              activeCollectionId={filter.collectionId}
              notes={notes}
              collections={collections}
              onSelectSection={(section, collectionId = null) =>
                setFilter((prev) => ({ ...prev, section, collectionId }))
              }
              onCreateCollection={handleCreateCollection}
              onRenameCollection={handleRenameCollection}
              onDeleteCollection={handleDeleteCollection}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onImportFile={handleImportFile}
            />
          )}

          {/* Pane 2: Notes List Panel */}
          {!isZenMode && (
            <div className="w-72 flex-shrink-0">
              <NotesPanel
                notes={notes}
                collections={collections}
                filter={filter}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onCreateNote={handleCreateNote}
                onSearchChange={(searchQuery) => setFilter((prev) => ({ ...prev, searchQuery }))}
                onSortChange={(sortBy) => setFilter((prev) => ({ ...prev, sortBy }))}
                onToggleChecklistFilter={() =>
                  setFilter((prev) => ({ ...prev, onlyChecklists: !prev.onlyChecklists }))
                }
                onEmptyTrash={handleEmptyTrash}
                searchInputRef={searchInputRef}
              />
            </div>
          )}

          {/* Pane 3: Writing Canvas */}
          <main className="flex-1 h-full">
            {currentNote ? (
              filter.section === "trash" ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
                    <span>Note is in trash</span>
                    <button
                      onClick={handleRestoreCurrentNote}
                      className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--accent-contrast)] hover:opacity-90"
                    >
                      Restore Note
                    </button>
                  </div>
                  <div className="flex-1">
                    <Editor
                      noteId={currentNote.id}
                      initialTitle={currentNote.title}
                      initialContent={currentNote.content}
                      isPinned={currentNote.is_pinned}
                      onSave={handleSaveNote}
                      isReadOnly={true}
                    />
                  </div>
                </div>
              ) : (
                <Editor
                  noteId={currentNote.id}
                  initialTitle={currentNote.title}
                  initialContent={currentNote.content}
                  isPinned={currentNote.is_pinned}
                  collectionId={currentNote.collection_id}
                  collections={collections}
                  onSelectCollection={handleMoveCurrentNoteToCollection}
                  onCreateCollection={handleCreateCollection}
                  onSave={handleSaveNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicateNote}
                  onDelete={handleDeleteCurrentNote}
                  onExport={handleExportNote}
                  onShare={() => setIsShareModalOpen(true)}
                  isMobile={false}
                  isZenMode={isZenMode}
                  onToggleZenMode={() => setIsZenMode((prev) => !prev)}
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                <p className="text-sm">Select a note or create a new one to start writing.</p>
                <button
                  onClick={handleCreateNote}
                  className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90"
                >
                  Create New Note
                </button>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* Mobile 2-screen layout */
        <div className="flex h-full w-full">
          {mobileScreen === "notes" ? (
            <div className="flex h-full w-full flex-col">
              {/* Mobile Header with Drawer Trigger, Brand, and Settings */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5 bg-[var(--bg-surface)]">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Menu"
                  >
                    <Menu size={18} />
                  </button>
                  <span className="text-sm font-semibold tracking-tight">Noted</span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="rounded p-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Settings
                </button>
              </div>
              <div className="flex-1">
                <NotesPanel
                  notes={notes}
                  collections={collections}
                  filter={filter}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={handleSelectNote}
                  onCreateNote={handleCreateNote}
                  onSearchChange={(searchQuery) => setFilter((prev) => ({ ...prev, searchQuery }))}
                  onSortChange={(sortBy) => setFilter((prev) => ({ ...prev, sortBy }))}
                  onToggleChecklistFilter={() =>
                    setFilter((prev) => ({ ...prev, onlyChecklists: !prev.onlyChecklists }))
                  }
                  onEmptyTrash={handleEmptyTrash}
                  searchInputRef={searchInputRef}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col">
              {currentNote && (
                <Editor
                  noteId={currentNote.id}
                  initialTitle={currentNote.title}
                  initialContent={currentNote.content}
                  isPinned={currentNote.is_pinned}
                  collectionId={currentNote.collection_id}
                  collections={collections}
                  onSelectCollection={handleMoveCurrentNoteToCollection}
                  onCreateCollection={handleCreateCollection}
                  onSave={handleSaveNote}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicateNote}
                  onDelete={handleDeleteCurrentNote}
                  onExport={handleExportNote}
                  onShare={() => setIsShareModalOpen(true)}
                  onBack={() => setMobileScreen("notes")}
                  isMobile={true}
                  isReadOnly={filter.section === "trash"}
                />
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Share Note Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={currentNote}
        onExportMarkdown={handleExportNote}
      />

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeSection={filter.section}
        activeCollectionId={filter.collectionId}
        notes={notes}
        collections={collections}
        theme={theme}
        onThemeChange={setTheme}
        onSelectSection={(section, collectionId = null) => {
          setFilter((prev) => ({ ...prev, section, collectionId }));
        }}
        onCreateCollection={handleCreateCollection}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={async (t) => {
          setTheme(t);
          const storage = await getStorageAdapter();
          await storage.setSetting("theme", t);
        }}
        pendingSyncCount={pendingSyncCount}
        lastSyncedAt={lastSyncedAt}
        onTriggerSync={async () => {
          await syncEngine.syncNow();
          const storage = await getStorageAdapter();
          const q = await storage.getPendingSyncQueue();
          setPendingSyncCount(q.length);
          const updatedNotes = await noteService.getAllNotes(true);
          setNotes(updatedNotes);
        }}
        onExportAll={handleExportAll}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
        onSaveSupabaseConfig={async (url, key) => {
          setSupabaseUrl(url);
          setSupabaseKey(key);
          await syncEngine.configureSupabase(url, key);
          await authService.configureClient(url, key);
        }}
        onImportFile={handleImportFile}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
