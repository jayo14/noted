import type { ThemePreference } from "@/types";
import { getStorageAdapter } from "@/lib/storage";

export type AccentColor = "default" | "warm" | "slate" | "sage";
export type FontFamily = "serif" | "sans" | "mono";
export type FontSize = "compact" | "normal" | "large";
export type LineHeight = "tight" | "normal" | "relaxed";
export type NoteListDensity = "comfortable" | "compact";
export type NotesViewMode = "list" | "grid";

export interface AppPreferences {
  // Writing & Typography
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineHeight: LineHeight;
  spellCheck: boolean;
  smartPunctuation: boolean;

  // Editor & Blocks
  autoGenerateTitle: boolean;
  showWordCount: boolean;
  showReadingTime: boolean;
  slashCommandsEnabled: boolean;
  markdownShortcutsEnabled: boolean;
  focusModeDimOthers: boolean;

  // Appearance
  theme: ThemePreference;
  accentColor: AccentColor;
  noteListDensity: NoteListDensity;
  notesViewMode: NotesViewMode;
  showChecklistPreview: boolean;

  // Cloud & Data
  confirmBeforeDelete: boolean;
  autoSaveDelayMs: number;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  fontFamily: "serif",
  fontSize: "normal",
  lineHeight: "normal",
  spellCheck: true,
  smartPunctuation: true,

  autoGenerateTitle: true,
  showWordCount: true,
  showReadingTime: true,
  slashCommandsEnabled: true,
  markdownShortcutsEnabled: true,
  focusModeDimOthers: false,

  theme: "system",
  accentColor: "default",
  noteListDensity: "comfortable",
  notesViewMode: "list",
  showChecklistPreview: true,

  confirmBeforeDelete: true,
  autoSaveDelayMs: 350,
};

type SettingsListener = (prefs: AppPreferences) => void;

const FONT_PREFS_STORAGE_KEY = "noted_font_prefs";

const FONT_FAMILY_STACKS: Record<FontFamily, string> = {
  serif: '"Newsreader", Georgia, Cambria, "Times New Roman", serif',
  sans: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const EDITOR_FONT_SIZES: Record<FontSize, string> = {
  compact: "0.90625rem",
  normal: "1rem",
  large: "1.125rem",
};

const EDITOR_LINE_HEIGHTS: Record<LineHeight, string> = {
  tight: "1.45",
  normal: "1.7",
  relaxed: "1.95",
};

export function applyFontPreferencesToDocument(
  prefs: Pick<AppPreferences, "fontFamily" | "fontSize" | "lineHeight">,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.fontFamily = prefs.fontFamily;
  root.dataset.fontSize = prefs.fontSize;
  root.dataset.lineHeight = prefs.lineHeight;
  root.style.setProperty("--noted-font-family", FONT_FAMILY_STACKS[prefs.fontFamily]);
  root.style.setProperty("--noted-editor-font-size", EDITOR_FONT_SIZES[prefs.fontSize]);
  root.style.setProperty("--noted-editor-line-height", EDITOR_LINE_HEIGHTS[prefs.lineHeight]);
}

function cacheFontPreferences(
  prefs: Pick<AppPreferences, "fontFamily" | "fontSize" | "lineHeight">,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      FONT_PREFS_STORAGE_KEY,
      JSON.stringify({
        fontFamily: prefs.fontFamily,
        fontSize: prefs.fontSize,
        lineHeight: prefs.lineHeight,
      }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function readCachedFontPreferences(): Partial<Pick<AppPreferences, "fontFamily" | "fontSize" | "lineHeight">> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(FONT_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    const result: Partial<Pick<AppPreferences, "fontFamily" | "fontSize" | "lineHeight">> = {};
    if (parsed.fontFamily === "serif" || parsed.fontFamily === "sans" || parsed.fontFamily === "mono") {
      result.fontFamily = parsed.fontFamily;
    }
    if (parsed.fontSize === "compact" || parsed.fontSize === "normal" || parsed.fontSize === "large") {
      result.fontSize = parsed.fontSize;
    }
    if (parsed.lineHeight === "tight" || parsed.lineHeight === "normal" || parsed.lineHeight === "relaxed") {
      result.lineHeight = parsed.lineHeight;
    }
    return result;
  } catch {
    return {};
  }
}

class SettingsService {
  private prefs: AppPreferences = { ...DEFAULT_PREFERENCES, ...readCachedFontPreferences() };
  private listeners: Set<SettingsListener> = new Set();
  private isLoaded = false;

  async init(): Promise<AppPreferences> {
    if (this.isLoaded) return this.prefs;

    try {
      const storage = await getStorageAdapter();
      const saved = await storage.getSetting<Partial<AppPreferences>>("app_preferences", {});
      this.prefs = { ...DEFAULT_PREFERENCES, ...readCachedFontPreferences(), ...saved };
    } catch {
      this.prefs = { ...DEFAULT_PREFERENCES, ...readCachedFontPreferences() };
    }

    this.isLoaded = true;
    applyFontPreferencesToDocument(this.prefs);
    cacheFontPreferences(this.prefs);
    this.notify();
    return this.prefs;
  }

  getPreferences(): AppPreferences {
    return { ...this.prefs };
  }

  async updatePreferences(updates: Partial<AppPreferences>): Promise<AppPreferences> {
    this.prefs = { ...this.prefs, ...updates };
    applyFontPreferencesToDocument(this.prefs);
    cacheFontPreferences(this.prefs);
    this.notify();

    try {
      const storage = await getStorageAdapter();
      await storage.setSetting("app_preferences", this.prefs);
    } catch (e) {
      console.error("[SettingsService] Failed to persist settings:", e);
    }

    return this.prefs;
  }

  async resetToDefaults(): Promise<AppPreferences> {
    this.prefs = { ...DEFAULT_PREFERENCES };
    applyFontPreferencesToDocument(this.prefs);
    cacheFontPreferences(this.prefs);
    this.notify();

    try {
      const storage = await getStorageAdapter();
      await storage.setSetting("app_preferences", this.prefs);
    } catch (e) {
      console.error("[SettingsService] Failed to reset settings:", e);
    }

    return this.prefs;
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.prefs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.prefs);
    }
  }
}

export const settingsService = new SettingsService();
