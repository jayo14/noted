import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { getEditorExtensions } from "./extensions";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { FormatToolbar } from "./FormatToolbar";
import { calculateNoteStats, extractTitleAndPreview } from "@/lib/utils";
import type { NoteStats, Collection } from "@/types";
import { Icon } from "@/components/ui/Icon";

interface EditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: JSONContent;
  isPinned?: boolean;
  collectionId?: string | null;
  collections?: Collection[];
  onSelectCollection?: (colId: string | null) => void;
  onCreateCollection?: (name: string) => Promise<void>;
  onSave: (title: string, content: JSONContent, stats: NoteStats) => void;
  onTogglePin?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onBack?: () => void;
  isMobile?: boolean;
  isReadOnly?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  noteId,
  initialTitle,
  initialContent,
  isPinned = false,
  collectionId = null,
  collections = [],
  onSelectCollection,
  onCreateCollection,
  onSave,
  onTogglePin,
  onDuplicate,
  onDelete,
  onExport,
  onShare,
  onBack,
  isMobile = false,
  isReadOnly = false,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isTitleExplicit, setIsTitleExplicit] = useState(
    initialTitle.trim().length > 0 && initialTitle !== "Untitled",
  );
  const [stats, setStats] = useState<NoteStats>({ words: 0, characters: 0, readingTimeMinutes: 0 });
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [newColInput, setNewColInput] = useState("");
  const [isCreatingInlineCol, setIsCreatingInlineCol] = useState(false);
  const [typographyMode, setTypographyMode] = useState<"serif" | "sans">("serif");

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const collectionMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (collectionMenuRef.current && !collectionMenuRef.current.contains(e.target as Node)) {
        setIsCollectionPickerOpen(false);
        setIsCreatingInlineCol(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Debounced save dispatcher
  const triggerSave = useCallback(
    (currentTitle: string, currentContent: JSONContent) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const computedStats = calculateNoteStats(currentContent);
        setStats(computedStats);
        onSave(currentTitle, currentContent, computedStats);
      }, 350);
    },
    [onSave],
  );

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent,
    editable: !isReadOnly,
    autofocus: "end",
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const currentStats = calculateNoteStats(json);
      setStats(currentStats);

      let effectiveTitle = title;
      if (!isTitleExplicit) {
        const { title: autoTitle } = extractTitleAndPreview(json, "Untitled");
        effectiveTitle = autoTitle;
        setTitle(autoTitle);
      }

      triggerSave(effectiveTitle, json);
    },
  });

  // When noteId changes, update editor content and title
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(initialContent || { type: "doc", content: [] });
      setTitle(initialTitle);
      const isExplicit = initialTitle.trim().length > 0 && initialTitle !== "Untitled";
      setIsTitleExplicit(isExplicit);
      setStats(calculateNoteStats(initialContent));
      setTimeout(() => {
        if (!editor.isDestroyed) {
          editor.commands.focus("end");
        }
      }, 50);
    }
  }, [noteId, editor]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsTitleExplicit(true);
    if (editor) {
      triggerSave(newTitle, editor.getJSON());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  };

  const scrollToTop = () => {
    canvasScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentCollection = collections.find((c) => c.id === collectionId);

  // Formatted date string for metadata row matching Image 1: "Today, 2:47 PM"
  const formattedDateTime = "Today, " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-editor)]">
      {/* Top formatting toolbar matching Image 1 */}
      <FormatToolbar
        editor={editor}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onExport={onExport}
        onShare={onShare}
        onBack={onBack}
        isMobile={isMobile}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
      />

      {/* Writing canvas scrollable area */}
      <div
        ref={canvasScrollRef}
        className="relative flex flex-1 flex-col overflow-y-auto px-6 py-8 md:px-16 lg:px-24 selection:bg-[var(--selection-bg)]"
      >
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col">
          {/* Note Title matching Image 1 (bold editorial serif) */}
          <div className="mb-2">
            <input
              ref={titleInputRef}
              type="text"
              value={title === "Untitled" && !isTitleExplicit ? "" : title}
              placeholder="Untitled"
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              className={`w-full bg-transparent text-3xl md:text-[38px] font-bold tracking-tight text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none border-none p-0 focus:ring-0 leading-tight ${
                typographyMode === "serif" ? "font-serif-title" : ""
              }`}
              disabled={isReadOnly}
            />
          </div>

          {/* Sub-row / Metadata row matching Image 1: "Today, 2:47 PM | 📁 Personal ⌵" */}
          <div className="mb-6 flex items-center gap-2.5 text-xs text-[var(--text-muted)] select-none">
            {/* Date info */}
            <div className="flex items-center gap-1.5">
              <Icon name="calendar_today" size={14} className="text-[var(--text-muted)]" />
              <span className="text-[12px]">{formattedDateTime}</span>
            </div>

            <span className="h-3 w-px bg-[var(--border-subtle)]" />

            {/* Collection tag dropdown */}
            <div className="relative" ref={collectionMenuRef}>
              <button
                onClick={() => setIsCollectionPickerOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Icon name="folder" size={14} className="text-[var(--text-muted)]" />
                <span>{currentCollection ? currentCollection.name : "Select Collection"}</span>
                <Icon name="expand_more" size={14} className="text-[var(--text-muted)]" />
              </button>

              {isCollectionPickerOpen && (
                <div className="absolute left-0 top-7 z-40 w-48 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1 shadow-xl">
                  <button
                    onClick={() => {
                      onSelectCollection?.(null);
                      setIsCollectionPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                      !collectionId ? "bg-[var(--bg-surface-active)] font-semibold" : "hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <Icon name="folder_off" size={14} />
                    <span>No Collection</span>
                  </button>

                  <div className="my-1 border-t border-[var(--border-subtle)]" />

                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCollection?.(c.id);
                        setIsCollectionPickerOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs truncate ${
                        collectionId === c.id ? "bg-[var(--bg-surface-active)] font-semibold" : "hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      <Icon name="folder" size={14} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}

                  {onCreateCollection && (
                    <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
                      {isCreatingInlineCol ? (
                        <div className="flex items-center gap-1 p-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="New name..."
                            value={newColInput}
                            onChange={(e) => setNewColInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && newColInput.trim()) {
                                await onCreateCollection(newColInput.trim());
                                setNewColInput("");
                                setIsCreatingInlineCol(false);
                                setIsCollectionPickerOpen(false);
                              }
                            }}
                            className="w-full rounded border border-[var(--border-strong)] px-2 py-0.5 text-xs outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCreatingInlineCol(true)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                        >
                          <Icon name="add" size={14} />
                          <span>New Collection...</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Floating Bubble Menu on selection */}
          <EditorBubbleMenu editor={editor} />

          {/* Tiptap Canvas */}
          <div className="flex-1 pb-16">
            <EditorContent editor={editor} className="tiptap-container" />
          </div>
        </div>

        {/* Floating Action Button (Black circular arrow-up button matching Image 1) */}
        <button
          onClick={scrollToTop}
          className="fixed bottom-12 right-8 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-[#161514] dark:bg-[#f7f5f0] text-white dark:text-[#161514] shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          title="Scroll to top"
        >
          <Icon name="arrow_upward" size={18} />
        </button>
      </div>

      {/* Bottom Status Bar matching Image 1 */}
      <div className="flex h-9 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-editor)] px-4 text-xs text-[var(--text-muted)] select-none">
        {/* Left: Aa typography toggle + word count */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTypographyMode((prev) => (prev === "serif" ? "sans" : "serif"))}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title={`Title font: ${typographyMode === "serif" ? "Serif" : "Sans"}. Click to switch.`}
          >
            <span>Aa</span>
          </button>
          <span className="text-[11.5px] text-[var(--text-muted)]">{stats.words} words</span>
        </div>

        {/* Right: Undo, Redo, Export / Actions icons matching Image 1 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors"
            title="Undo (Cmd+Z)"
          >
            <Icon name="undo" size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors"
            title="Redo (Cmd+Shift+Z)"
          >
            <Icon name="redo" size={16} />
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
              title="Export note"
            >
              <Icon name="open_in_new" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
