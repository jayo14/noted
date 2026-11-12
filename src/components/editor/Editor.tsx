import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { getEditorExtensions } from "./extensions";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { FormatToolbar } from "./FormatToolbar";
import { calculateNoteStats, extractTitleAndPreview } from "@/lib/utils";
import type { NoteStats } from "@/types";

interface EditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: JSONContent;
  isPinned?: boolean;
  onSave: (title: string, content: JSONContent, stats: NoteStats) => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onBack?: () => void;
  isMobile?: boolean;
  isReadOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  noteId,
  initialTitle,
  initialContent,
  isPinned = false,
  onSave,
  onTogglePin,
  onDelete,
  onExport,
  onBack,
  isMobile = false,
  isReadOnly = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isTitleExplicit, setIsTitleExplicit] = useState(
    initialTitle.trim().length > 0 && initialTitle !== "Untitled",
  );
  const [stats, setStats] = useState<NoteStats>({ words: 0, characters: 0, readingTimeMinutes: 0 });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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
      // Focus editor
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-app)]">
      {/* Top formatting toolbar */}
      <FormatToolbar
        editor={editor}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        onDelete={onDelete}
        onExport={onExport}
        onBack={onBack}
        isMobile={isMobile}
      />

      {/* Writing canvas */}
      <div className="relative flex flex-1 flex-col overflow-y-auto px-4 py-8 md:px-12 lg:px-20 selection:bg-[var(--selection-bg)]">
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col">
          {/* Title Input */}
          <div className="mb-4">
            <input
              ref={titleInputRef}
              type="text"
              value={title === "Untitled" && !isTitleExplicit ? "" : title}
              placeholder="Untitled"
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              className="w-full bg-transparent text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] placeholder-[var(--text-subtle)] outline-none transition-colors border-none p-0 focus:ring-0"
              disabled={isReadOnly}
            />
          </div>

          {/* Floating Bubble Menu */}
          <EditorBubbleMenu editor={editor} />

          {/* Tiptap Canvas */}
          <div className="flex-1 pb-16">
            <EditorContent editor={editor} className="tiptap-container" />
          </div>

          {/* Quiet Bottom Metadata Indicator */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/90 py-2.5 text-xs text-[var(--text-muted)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span>{stats.words} words</span>
              <span>·</span>
              <span>{stats.characters} chars</span>
              <span>·</span>
              <span>{stats.readingTimeMinutes} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-subtle)]" />
              <span>Saved locally</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
