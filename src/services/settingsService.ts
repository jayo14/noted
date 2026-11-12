import type { ThemePreference } from "@/types";
import { getStorageAdapter } from "@/lib/storage";

export type AccentColor = "default" | "warm" | "slate" | "sage" | "amber";
export type FontFamily = "serif" | "sans" | "mono";
export type FontSize = "compact" | "normal" | "large";
export type LineHeight = "tight" | "normal" | "relaxed";
export type NoteListDensity = "comfortable" | "compact";

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
  showChecklistPreview: true,

  confirmBeforeDelete: true,
  autoSaveDelayMs: 350,
};

type SettingsListener = (prefs: AppPreferences) => void;

class SettingsService {
  private prefs: AppPreferences = { ...DEFAULT_PREFERENCES };
  private listeners: Set<SettingsListener> = new Set();
  private isLoaded = false;

  async init(): Promise<AppPreferences> {
    if (this.isLoaded) return this.prefs;

    try {
      const storage = await getStorageAdapter();
      const saved = await storage.getSetting<Partial<AppPreferences>>("app_preferences", {});
      this.prefs = { ...DEFAULT_PREFERENCES, ...saved };
    } catch {
      this.prefs = { ...DEFAULT_PREFERENCES };
    }

    this.isLoaded = true;
    this.notify();
    return this.prefs;
  }

  getPreferences(): AppPreferences {
    return { ...this.prefs };
  }

  async updatePreferences(updates: Partial<AppPreferences>): Promise<AppPreferences> {
    this.prefs = { ...this.prefs, ...updates };
    this.notify();

    try {
      const storage = await getStorageAdapter();
      await storage.setSetting("app_preferences", this.prefs);
    } catch (e) {
      console.error("[SettingsService] Failed to persist settings:", e);
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
