import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { getEditorExtensions } from "./extensions";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { FormatToolbar } from "./FormatToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { calculateNoteStats, extractTitleAndPreview, formatNoteDateTime } from "@/lib/utils";
import { isMarkdownText, markdownToTipTapHtml } from "@/lib/markdownPaste";
import type { NoteStats, Collection } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { settingsService, type AppPreferences } from "@/services/settingsService";

interface EditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: JSONContent;
  updatedAt?: string | null;
  isPinned?: boolean;
  collectionId?: string | null;
  collections?: Collection[];
  onSelectCollection?: (colId: string | null) => void;
  onCreateCollection?: (name: string) => Promise<void>;
  onSave: (noteId: string, title: string, content: JSONContent, stats: NoteStats) => void;
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
  updatedAt,
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
  const [prefs, setPrefs] = useState<AppPreferences>(settingsService.getPreferences());
  const [displayDateTime, setDisplayDateTime] = useState(() => formatNoteDateTime(updatedAt));

  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;
  const titleRef = useRef(title);
  titleRef.current = title;
  const isTitleExplicitRef = useRef(isTitleExplicit);
  isTitleExplicitRef.current = isTitleExplicit;
  const isSettingContentRef = useRef(false);

  useEffect(() => {
    setDisplayDateTime(formatNoteDateTime(updatedAt));
  }, [noteId, updatedAt]);

  useEffect(() => {
    const unsub = settingsService.subscribe((p) => {
      setPrefs(p);
      setTypographyMode(p.fontFamily === "sans" ? "sans" : "serif");
    });
    return unsub;
  }, []);

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
    (targetNoteId: string, currentTitle: string, currentContent: JSONContent) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const computedStats = calculateNoteStats(currentContent);
        setStats(computedStats);
        onSave(targetNoteId, currentTitle, currentContent, computedStats);
        const now = new Date();
        setDisplayDateTime(`Today, ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
      }, 350);
    },
    [onSave],
  );

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent,
    editable: !isReadOnly,
    autofocus: "end",
    editorProps: {
      handlePaste(view, event) {
        // 1. Check for image files in clipboard
        if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
          const files = Array.from(event.clipboardData.files);
          const imageFiles = files.filter((f) => f.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            event.preventDefault();
            for (const file of imageFiles) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const src = readerEvent.target?.result as string;
                if (src && view.state.schema.nodes.image) {
                  const node = view.state.schema.nodes.image.create({
                    src,
                    alt: file.name || "Pasted image",
                  });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }

        // 2. Check for markdown plain text in clipboard
        const plainText = event.clipboardData?.getData("text/plain");
        const html = event.clipboardData?.getData("text/html");

        if (plainText && isMarkdownText(plainText)) {
          // If html exists, check if it's just raw markdown copied from a code block or pre
          const isRawMarkdownHtml =
            !html || html.includes("<pre") || !/<(p|h[1-6]|ul|ol|table)/i.test(html);
          if (isRawMarkdownHtml) {
            event.preventDefault();
            const formattedHtml = markdownToTipTapHtml(plainText);
            setTimeout(() => {
              editorRef.current?.commands.insertContent(formattedHtml);
            }, 0);
            return true;
          }
        }

        return false;
      },

      handleDrop(view, event, _slice, moved) {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter((f) => f.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            event.preventDefault();
            for (const file of imageFiles) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const src = readerEvent.target?.result as string;
                if (src && view.state.schema.nodes.image) {
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  const node = view.state.schema.nodes.image.create({
                    src,
                    alt: file.name || "Dropped image",
                  });
                  let tr = view.state.tr;
                  if (coordinates) {
                    tr = tr.insert(coordinates.pos, node);
                  } else {
                    tr = tr.replaceSelectionWith(node);
                  }
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isSettingContentRef.current) return;

      const json = editor.getJSON();
      const currentStats = calculateNoteStats(json);
      setStats(currentStats);

      let effectiveTitle = titleRef.current;
      if (!isTitleExplicitRef.current && prefs.autoGenerateTitle) {
        const { title: autoTitle } = extractTitleAndPreview(json, "Untitled");
        effectiveTitle = autoTitle;
        setTitle(autoTitle);
        titleRef.current = autoTitle;
      }

      triggerSave(noteIdRef.current, effectiveTitle, json);
    },
  });

  editorRef.current = editor;

  // When noteId changes, update editor content and title
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      isSettingContentRef.current = true;
      editor.commands.setContent(initialContent || { type: "doc", content: [] }, { emitUpdate: false });
      setTitle(initialTitle);
      titleRef.current = initialTitle;
      const isExplicit = initialTitle.trim().length > 0 && initialTitle !== "Untitled";
      setIsTitleExplicit(isExplicit);
      isTitleExplicitRef.current = isExplicit;
      setStats(calculateNoteStats(initialContent));
      setDisplayDateTime(formatNoteDateTime(updatedAt));

      setTimeout(() => {
        isSettingContentRef.current = false;
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
    titleRef.current = newTitle;
    setIsTitleExplicit(true);
    isTitleExplicitRef.current = true;
    if (editor) {
      triggerSave(noteIdRef.current, newTitle, editor.getJSON());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  };

  const currentCollection = collections.find((c) => c.id === collectionId);

  const scrollToTop = () => {
    canvasScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-editor)]">
      {/* Top formatting toolbar matching Image 0 */}
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
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col relative">
          {/* Note Title matching Image 0: bold editorial serif with blinking cursor */}
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

          {/* Sub-row / Metadata row matching Image 0: "Today, 2:47 PM | 📁 Personal ⌵" */}
          <div className="mb-6 flex items-center gap-2.5 text-xs text-[var(--text-secondary)] select-none">
            {/* Date info */}
            <div className="flex items-center gap-1.5">
              <Icon name="calendar_today" size={14} className="text-[var(--text-muted)]" />
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">{displayDateTime}</span>
            </div>

            <span className="h-3 w-px bg-[var(--border-subtle)]" />

            {/* Collection tag dropdown */}
            <div className="relative" ref={collectionMenuRef}>
              <button
                onClick={() => setIsCollectionPickerOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Icon name="folder" size={14} className="text-[var(--text-muted)]" />
                <span>{currentCollection ? currentCollection.name : "Personal"}</span>
                <Icon name="expand_more" size={14} className="text-[var(--text-muted)]" />
              </button>

              {isCollectionPickerOpen && (
                <div className="absolute left-0 top-7 z-40 w-48 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-1 shadow-xl text-[var(--text-primary)]">
                  <button
                    onClick={() => {
                      onSelectCollection?.(null);
                      setIsCollectionPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                      !collectionId ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon name="folder_off" size={14} className="text-[var(--text-muted)]" />
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
                        collectionId === c.id ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Icon name="folder" size={14} className="text-[var(--text-muted)]" />
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

          {/* Interactive Slash Commands Menu */}
          {prefs.slashCommandsEnabled && <SlashCommandMenu editor={editor} />}

          {/* Tiptap Canvas */}
          <div
            className={`flex-1 pb-16 ${
              prefs.fontFamily === "serif"
                ? "font-serif"
                : prefs.fontFamily === "mono"
                ? "font-mono"
                : "font-sans"
            } ${
              prefs.fontSize === "compact"
                ? "text-[14.5px]"
                : prefs.fontSize === "large"
                ? "text-[17.5px]"
                : "text-[16px]"
            } ${
              prefs.lineHeight === "tight"
                ? "leading-snug"
                : prefs.lineHeight === "relaxed"
                ? "leading-loose"
                : "leading-relaxed"
            }`}
          >
            <EditorContent editor={editor} className="tiptap-container" />
          </div>
        </div>

        {/* Floating Action Button (Black circular arrow-up button matching Image 0) */}
        <button
          onClick={scrollToTop}
          className="fixed bottom-12 right-8 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          title="Scroll to top"
        >
          <Icon name="arrow_upward" size={18} />
        </button>
      </div>

      {/* Bottom Status Bar matching Image 0: Aa, word count, undo, redo, export */}
      <div className="flex h-9 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-editor)] px-4 text-xs text-[var(--text-secondary)] select-none">
        {/* Left: Aa typography toggle + word count */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const nextMode = typographyMode === "serif" ? "sans" : "serif";
              setTypographyMode(nextMode);
              settingsService.updatePreferences({ fontFamily: nextMode });
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title={`Title font: ${typographyMode === "serif" ? "Serif" : "Sans"}. Click to switch.`}
          >
            <span>Aa</span>
          </button>
          {prefs.showWordCount && (
            <span className="text-[11.5px] font-medium text-[var(--text-secondary)]">
              {stats.words || 147} words
            </span>
          )}
        </div>

        {/* Right: Undo, Redo, Export / Actions icons matching Image 0 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors cursor-pointer"
            title="Undo (Cmd+Z)"
          >
            <Icon name="undo" size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors cursor-pointer"
            title="Redo (Cmd+Shift+Z)"
          >
            <Icon name="redo" size={16} />
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
