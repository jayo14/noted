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
import { settingsService, type NotesViewMode } from "@/services/settingsService";
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
  const [notesViewMode, setNotesViewMode] = useState<NotesViewMode>(
    () => settingsService.getPreferences().notesViewMode || "list",
  );

  useEffect(() => {
    return settingsService.subscribe((prefs) => {
      setNotesViewMode(prefs.notesViewMode || "list");
    });
  }, []);

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
          { name: "Ideas", icon: "lightbulb" },
          { name: "Tasks", icon: "check_box" },
          { name: "Personal", icon: "person" },
          { name: "Projects", icon: "folder" },
          { name: "Later", icon: "schedule" },
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
        const ideasCol = loadedCollections.find((c) => c.name === "Ideas")?.id || null;
        const tasksCol = loadedCollections.find((c) => c.name === "Tasks")?.id || null;
        const personalCol = loadedCollections.find((c) => c.name === "Personal")?.id || null;
        const projectsCol = loadedCollections.find((c) => c.name === "Projects")?.id || null;
        const laterCol = loadedCollections.find((c) => c.name === "Later")?.id || null;

        // Note 1: Weekend plans (Pinned, Active, matching Image 0)
        const nowMs = Date.now();
        const noteWeekend = await noteService.createNote(personalCol, "Weekend plans");
        noteWeekend.is_pinned = true;
        noteWeekend.created_at = new Date(nowMs - 2 * 60 * 1000).toISOString();
        noteWeekend.updated_at = new Date(nowMs - 2 * 60 * 1000).toISOString();
        noteWeekend.content = {
          type: "doc",
          content: [
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Finish the Kova update" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: true },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Read something good" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Work on Log2Def slides" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Go for a walk" }] }],
                },
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Plan next week" }] }],
                },
              ],
            },
            {
              type: "horizontalRule",
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "▾ Ideas" }],
            },
            {
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "A calmer mind builds a better future." }],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Notes:" }],
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
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Make formatting feel effortless" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Sync across all my devices" }] }],
                },
              ],
            },
          ],
        };
        await noteService.updateNote(noteWeekend.id, { content: noteWeekend.content, is_pinned: true });

        // Note 2: Project ideas (matching Image 0)
        const noteIdeas = await noteService.createNote(ideasCol, "Project ideas");
        noteIdeas.created_at = new Date(nowMs - 60 * 60 * 1000).toISOString();
        noteIdeas.updated_at = new Date(nowMs - 60 * 60 * 1000).toISOString();
        noteIdeas.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "A better way to track dev gigs in Nigeria. Maybe a platform..." }],
            },
          ],
        };
        await noteService.updateNote(noteIdeas.id, { content: noteIdeas.content });

        // Note 3: A little poem (matching Image 0)
        const notePoem = await noteService.createNote(personalCol, "A little poem");
        notePoem.created_at = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
        notePoem.updated_at = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
        notePoem.content = {
          type: "doc",
          content: [
            {
              type: "blockquote",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "The night is quiet,\nand so is my mind..." }],
                },
              ],
            },
          ],
        };
        await noteService.updateNote(notePoem.id, { content: notePoem.content });

        // Note 4: Groceries (matching Image 0)
        const noteGroceries = await noteService.createNote(tasksCol, "Groceries");
        noteGroceries.created_at = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
        noteGroceries.updated_at = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
        noteGroceries.content = {
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
        await noteService.updateNote(noteGroceries.id, { content: noteGroceries.content });

        // Note 5: Study notes (matching Image 0)
        const noteStudy = await noteService.createNote(projectsCol, "Study notes");
        noteStudy.created_at = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
        noteStudy.updated_at = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
        noteStudy.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data structures: trees,\ngraphs and heaps..." }],
            },
          ],
        };
        await noteService.updateNote(noteStudy.id, { content: noteStudy.content });

        // Note 6: Later (matching Image 0)
        const noteLater = await noteService.createNote(laterCol, "Later");
        noteLater.created_at = new Date(nowMs - 25 * 60 * 60 * 1000).toISOString();
        noteLater.updated_at = new Date(nowMs - 25 * 60 * 60 * 1000).toISOString();
        noteLater.content = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Check out the new Tauri features..." }],
            },
          ],
        };
        await noteService.updateNote(noteLater.id, { content: noteLater.content });

        const allSeedNotes = [
          noteWeekend,
          noteIdeas,
          notePoem,
          noteGroceries,
          noteStudy,
          noteLater,
        ];
        setNotes(allSeedNotes);
        setSelectedNoteId(noteWeekend.id);
      } else {
        // Self-heal any seeded notes that had their titles clobbered by the previous cross-note bug
        const repairedNotes = await Promise.all(
          loadedNotes.map(async (n) => {
            const text = extractTextFromJSONContent(n.content);
            let intendedTitle = n.title;

            if (text.includes("Finish the Kova update") && n.title !== "Weekend plans") {
              intendedTitle = "Weekend plans";
            } else if (text.includes("dev gigs in Nigeria") && n.title !== "Project ideas") {
              intendedTitle = "Project ideas";
            } else if (text.includes("The night is quiet") && n.title !== "A little poem") {
              intendedTitle = "A little poem";
            } else if (text.includes("Milk") && text.includes("Eggs") && n.title !== "Groceries") {
              intendedTitle = "Groceries";
            } else if (text.includes("Data structures: trees") && n.title !== "Study notes") {
              intendedTitle = "Study notes";
            } else if (text.includes("Tauri features") && n.title !== "Later") {
              intendedTitle = "Later";
            }

            if (intendedTitle !== n.title) {
              await noteService.updateNote(n.id, { title: intendedTitle });
              return { ...n, title: intendedTitle };
            }
            return n;
          }),
        );

        setNotes(repairedNotes);
        const active = repairedNotes.filter((n) => n.deleted_at === null);
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
    async (targetNoteId: string, newTitle: string, newContent: Note["content"], _stats: NoteStats) => {
      const updated = await noteService.updateNote(targetNoteId, {
        title: newTitle,
        content: newContent,
      });

      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }
    },
    [],
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
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const nextMode: NotesViewMode = notesViewMode === "grid" ? "list" : "grid";
        setNotesViewMode(nextMode);
        settingsService.updatePreferences({ notesViewMode: nextMode });
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
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-editor)] text-[var(--text-primary)] antialiased select-none">
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
            <div
              className={`${
                notesViewMode === "grid" ? "w-[350px]" : "w-72"
              } flex-shrink-0 transition-all duration-200`}
            >
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
                      key={currentNote.id}
                      noteId={currentNote.id}
                      initialTitle={currentNote.title}
                      initialContent={currentNote.content}
                      updatedAt={currentNote.updated_at}
                      isPinned={currentNote.is_pinned}
                      onSave={handleSaveNote}
                      isReadOnly={true}
                    />
                  </div>
                </div>
              ) : (
                <Editor
                  key={currentNote.id}
                  noteId={currentNote.id}
                  initialTitle={currentNote.title}
                  initialContent={currentNote.content}
                  updatedAt={currentNote.updated_at}
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
                  key={currentNote.id}
                  noteId={currentNote.id}
                  initialTitle={currentNote.title}
                  initialContent={currentNote.content}
                  updatedAt={currentNote.updated_at}
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
