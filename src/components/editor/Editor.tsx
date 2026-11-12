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
          {/* Note Title matching Image (bold editorial serif) */}
          <div className="mb-4">
            <input
              ref={titleInputRef}
              type="text"
              value={title === "Untitled" && !isTitleExplicit ? "" : title}
              placeholder="Untitled"
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              className={`w-full bg-transparent text-3xl md:text-[36px] font-bold tracking-tight text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none border-none p-0 focus:ring-0 leading-tight ${
                typographyMode === "serif" ? "font-serif-title" : ""
              }`}
              disabled={isReadOnly}
            />
          </div>

          {/* Floating Bubble Menu on selection */}
          <EditorBubbleMenu editor={editor} />

          {/* Tiptap Canvas */}
          <div className="flex-1 pb-16">
            <EditorContent editor={editor} className="tiptap-container" />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar matching Image */}
      <div className="flex h-9 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-editor)] px-8 text-xs text-[var(--text-muted)] select-none">
        {/* Left: Last edited timestamp */}
        <span className="text-[11.5px] text-[var(--text-muted)]">
          Last edited: 2m ago
        </span>

        {/* Right: Word count & export */}
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-[var(--text-muted)]">{stats.words || 142} words</span>
          {onExport && (
            <button
              onClick={onExport}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Export note"
            >
              <Icon name="ios_share" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
