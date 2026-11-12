import React, { useState, useEffect } from "react";
import type { ThemePreference } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import {
  settingsService,
  type AppPreferences,
  type FontFamily,
  type FontSize,
  type LineHeight,
  type NoteListDensity,
  type NotesViewMode,
} from "@/services/settingsService";
import { Icon } from "@/components/ui/Icon";

export type SettingsTab =
  | "writing"
  | "editor"
  | "appearance"
  | "sync"
  | "account"
  | "backup"
  | "shortcuts";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  onTriggerSync: () => Promise<void>;
  onExportAll: (format: "markdown" | "json") => void;
  supabaseUrl: string;
  supabaseKey: string;
  onSaveSupabaseConfig: (url: string, key: string) => Promise<void>;
  onImportFile?: (file: File) => Promise<void>;
}

// Reusable Setting Row
const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]/70 last:border-b-0 gap-4">
    <div className="flex flex-col min-w-0 pr-2">
      <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">
        {title}
      </span>
      {description && (
        <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
          {description}
        </span>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// Toggle Switch Component
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--accent-contrast)] shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  pendingSyncCount,
  lastSyncedAt,
  onTriggerSync,
  onExportAll,
  supabaseUrl,
  supabaseKey,
  onSaveSupabaseConfig,
  onImportFile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("writing");
  const [prefs, setPrefs] = useState<AppPreferences>(settingsService.getPreferences());

  // Cloud & Supabase state
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseKey);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Shortcuts search filter
  const [shortcutsSearch, setShortcutsSearch] = useState("");

  useEffect(() => {
    setUrl(supabaseUrl);
    setKey(supabaseKey);
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setCurrentUser(state.user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = settingsService.subscribe((newPrefs) => {
      setPrefs(newPrefs);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const updatePref = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    settingsService.updatePreferences({ [key]: value });
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSupabaseConfig(url.trim(), key.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email.trim() || !password.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authMode === "signin") {
        const { user, error } = await authService.signIn(email.trim(), password);
        if (error) {
          setAuthError(error);
        } else if (user) {
          setAuthSuccess(`Signed in as ${user.email}`);
          setEmail("");
          setPassword("");
        }
      } else {
        const { user, error } = await authService.signUp(email.trim(), password);
        if (error) {
          setAuthError(error);
        } else if (user) {
          setAuthSuccess("Account created successfully!");
          setEmail("");
          setPassword("");
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await authService.signOut();
      setAuthSuccess("Signed out successfully.");
      setTimeout(() => setAuthSuccess(null), 2500);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const navItems: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "writing", label: "Writing & Fonts", icon: "edit_note" },
    { id: "editor", label: "Editor Behavior", icon: "tune" },
    { id: "appearance", label: "Appearance & Theme", icon: "palette" },
    { id: "sync", label: "Cloud & Sync", icon: "cloud_sync" },
    { id: "account", label: "Account & Profile", icon: "person" },
    { id: "backup", label: "Data & Storage", icon: "database" },
    { id: "shortcuts", label: "Shortcuts", icon: "keyboard" },
  ];

  const allShortcuts = [
    { group: "Writing", label: "Bold text", key: "Cmd/Ctrl + B" },
    { group: "Writing", label: "Italic text", key: "Cmd/Ctrl + I" },
    { group: "Writing", label: "Underline text", key: "Cmd/Ctrl + U" },
    { group: "Writing", label: "Strikethrough", key: "Cmd/Ctrl + Shift + X" },
    { group: "Writing", label: "Insert code block", key: "Cmd/Ctrl + E" },
    { group: "Writing", label: "Insert checklist", key: "[] + Space" },
    { group: "Writing", label: "Heading 1 / 2 / 3", key: "# / ## / ### + Space" },
    { group: "Navigation", label: "New note", key: "Cmd/Ctrl + N" },
    { group: "Navigation", label: "Search notes", key: "Cmd/Ctrl + F or Ctrl + K" },
    { group: "Navigation", label: "Toggle list / grid layout", key: "Cmd/Ctrl + Shift + L" },
    { group: "Navigation", label: "Pin note", key: "Cmd/Ctrl + P" },
    { group: "Navigation", label: "Export Markdown", key: "Cmd/Ctrl + Shift + M" },
    { group: "Navigation", label: "Delete note", key: "Cmd/Ctrl + Shift + D" },
    { group: "Navigation", label: "Undo / Redo", key: "Cmd/Ctrl + Z / Shift + Z" },
  ];

  const filteredShortcuts = allShortcuts.filter(
    (s) =>
      s.label.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
      s.key.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
      s.group.toLowerCase().includes(shortcutsSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="flex h-[580px] w-full max-w-3xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-editor)] shadow-2xl overflow-hidden transition-all">
        {/* Left Navigation Sidebar */}
        <aside className="flex w-56 flex-shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 text-[var(--text-primary)]">
          <div>
            {/* Header branding */}
            <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </div>
              <span className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
                Preferences
              </span>
            </div>

            {/* Nav list */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? "bg-[var(--bg-surface-active)] font-semibold text-[var(--text-primary)] shadow-2xs"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={17}
                      className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                    />
                    <span className="text-[12.5px] truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom badge */}
          <div className="border-t border-[var(--border-subtle)] px-2 pt-3 text-[11px] text-[var(--text-muted)]">
            <div className="font-semibold text-[var(--text-secondary)]">noted. v1.2.0</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Local-first writing engine</div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-editor)]">
          {/* Top Window Header */}
          <div className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-6">
            <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <Icon name="close" size={17} />
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 text-xs text-[var(--text-primary)]">
            {/* 1. WRITING & FONTS */}
            {activeTab === "writing" && (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <SettingRow
                    title="Font Family"
                    description="Choose your preferred writing typeface."
                  >
                    <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                      {(["serif", "sans", "mono"] as FontFamily[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => updatePref("fontFamily", f)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                            prefs.fontFamily === f
                              ? "bg-[var(--bg-editor)] font-semibold text-[var(--text-primary)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {f === "serif" ? "Newsreader" : f === "sans" ? "Sans" : "Monospace"}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Font Size"
                    description="Base text scale across documents."
                  >
                    <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                      {(["compact", "normal", "large"] as FontSize[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updatePref("fontSize", s)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                            prefs.fontSize === s
                              ? "bg-[var(--bg-editor)] font-semibold text-[var(--text-primary)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Line Height"
                    description="Vertical spacing between paragraphs."
                  >
                    <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                      {(["tight", "normal", "relaxed"] as LineHeight[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => updatePref("lineHeight", l)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                            prefs.lineHeight === l
                              ? "bg-[var(--bg-editor)] font-semibold text-[var(--text-primary)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Spell Check"
                    description="Highlight typo errors automatically in editor."
                  >
                    <ToggleSwitch
                      checked={prefs.spellCheck}
                      onChange={(checked) => updatePref("spellCheck", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Smart Punctuation"
                    description="Convert straight quotes into typographic curly quotes."
                  >
                    <ToggleSwitch
                      checked={prefs.smartPunctuation}
                      onChange={(checked) => updatePref("smartPunctuation", checked)}
                    />
                  </SettingRow>
                </div>

                {/* Typography Live Preview */}
                <div>
                  <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Live Sample Preview
                  </span>
                  <div
                    className={`mt-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-4 ${
                      prefs.fontFamily === "serif"
                        ? "font-serif"
                        : prefs.fontFamily === "mono"
                        ? "font-mono"
                        : "font-sans"
                    } ${
                      prefs.fontSize === "compact"
                        ? "text-[14px]"
                        : prefs.fontSize === "large"
                        ? "text-[18px]"
                        : "text-[16px]"
                    } ${
                      prefs.lineHeight === "tight"
                        ? "leading-snug"
                        : prefs.lineHeight === "relaxed"
                        ? "leading-loose"
                        : "leading-relaxed"
                    }`}
                  >
                    <h4 className="text-lg font-bold mb-1.5">The Quiet Canvas</h4>
                    <p className="text-[var(--text-primary)]">
                      A great notes app should disappear, letting you focus on what matters: your thoughts. Open, write, and let the application adapt gracefully.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. EDITOR BEHAVIOR */}
            {activeTab === "editor" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <SettingRow
                    title="Automatic Note Titles"
                    description="Derive a smart title automatically from your first line."
                  >
                    <ToggleSwitch
                      checked={prefs.autoGenerateTitle}
                      onChange={(checked) => updatePref("autoGenerateTitle", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Slash Commands Menu (/)"
                    description="Type / anywhere in the editor to insert headings, lists, quotes, and dividers."
                  >
                    <ToggleSwitch
                      checked={prefs.slashCommandsEnabled}
                      onChange={(checked) => updatePref("slashCommandsEnabled", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Markdown Input Shortcuts"
                    description="Convert #, [], -, and > naturally into rich blocks as you type."
                  >
                    <ToggleSwitch
                      checked={prefs.markdownShortcutsEnabled}
                      onChange={(checked) => updatePref("markdownShortcutsEnabled", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Word Count Display"
                    description="Show real-time word counter at the bottom of the canvas."
                  >
                    <ToggleSwitch
                      checked={prefs.showWordCount}
                      onChange={(checked) => updatePref("showWordCount", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Dim Non-Active Blocks in Focus Mode"
                    description="Subtly reduce opacity of surrounding paragraphs when focusing."
                  >
                    <ToggleSwitch
                      checked={prefs.focusModeDimOthers}
                      onChange={(checked) => updatePref("focusModeDimOthers", checked)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Confirm Before Deleting Notes"
                    description="Ask for confirmation when moving notes to trash."
                  >
                    <ToggleSwitch
                      checked={prefs.confirmBeforeDelete}
                      onChange={(checked) => updatePref("confirmBeforeDelete", checked)}
                    />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 3. APPEARANCE & THEME */}
            {activeTab === "appearance" && (
              <div className="flex flex-col gap-5">
                <div>
                  <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Interface Theme
                  </span>
                  <div className="mt-2.5 grid grid-cols-3 gap-3">
                    {/* Light tile */}
                    <button
                      onClick={() => onThemeChange("light")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        theme === "light"
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/15 bg-[var(--bg-surface-active)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      <div className="flex h-12 w-full rounded-lg bg-[#FAF6F2] border border-[#DED8D2] p-2 items-center justify-between mb-2 shadow-2xs">
                        <div className="h-3 w-8 rounded bg-[#141312]" />
                        <Icon name="light_mode" size={16} className="text-[#141312]" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Light</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Warm paper canvas</span>
                    </button>

                    {/* Dark tile */}
                    <button
                      onClick={() => onThemeChange("dark")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        theme === "dark"
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/15 bg-[var(--bg-surface-active)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      <div className="flex h-12 w-full rounded-lg bg-[#141413] border border-[#2B2B28] p-2 items-center justify-between mb-2 shadow-2xs">
                        <div className="h-3 w-8 rounded bg-[#F7F5F0]" />
                        <Icon name="dark_mode" size={16} className="text-[#F7F5F0]" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Dark</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Midnight obsidian</span>
                    </button>

                    {/* System tile */}
                    <button
                      onClick={() => onThemeChange("system")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        theme === "system"
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/15 bg-[var(--bg-surface-active)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      <div className="flex h-12 w-full rounded-lg bg-gradient-to-r from-[#FAF6F2] to-[#141413] border border-[var(--border-subtle)] p-2 items-center justify-between mb-2 shadow-2xs">
                        <div className="h-3 w-8 rounded bg-[var(--accent)]" />
                        <Icon name="desktop_windows" size={16} className="text-[var(--text-primary)]" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">System</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Match OS theme</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <SettingRow
                    title="Default Notes Layout"
                    description="Choose your preferred presentation in the notes pane."
                  >
                    <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                      {(["list", "grid"] as NotesViewMode[]).map((v) => (
                        <button
                          key={v}
                          onClick={() => updatePref("notesViewMode", v)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                            prefs.notesViewMode === v
                              ? "bg-[var(--bg-editor)] font-semibold text-[var(--text-primary)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Note List Density"
                    description="Adjust spacing and padding in the middle notes panel."
                  >
                    <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                      {(["comfortable", "compact"] as NoteListDensity[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => updatePref("noteListDensity", d)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                            prefs.noteListDensity === d
                              ? "bg-[var(--bg-editor)] font-semibold text-[var(--text-primary)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Checklist Previews on Note Cards"
                    description="Render structured task items with checkmarks in list cards."
                  >
                    <ToggleSwitch
                      checked={prefs.showChecklistPreview}
                      onChange={(checked) => updatePref("showChecklistPreview", checked)}
                    />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 4. CLOUD & SYNC */}
            {activeTab === "sync" && (
              <div className="flex flex-col gap-5">
                {/* Real-time sync engine status card */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-editor)] text-[var(--accent)] border border-[var(--border-subtle)]">
                      <Icon name="cloud_sync" size={20} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                        Local-First Sync Engine
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {pendingSyncCount > 0
                          ? `${pendingSyncCount} operations queued for synchronization`
                          : "Everything saved locally & in sync"}
                      </div>
                      {lastSyncedAt && (
                        <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                          Last sync: {new Date(lastSyncedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs cursor-pointer"
                  >
                    <Icon name="refresh" size={14} className={isSyncing ? "animate-spin" : ""} />
                    <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                  </button>
                </div>

                {/* Supabase backend connection credentials */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <div className="mb-3">
                    <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                      Supabase Cloud Backend
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Enter your project credentials for cross-device synchronization and row-level security.
                    </p>
                  </div>

                  <form onSubmit={handleConfigSave} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyzcompany.supabase.co"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Supabase Anon Key
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {isSaved ? "Configuration updated successfully" : ""}
                      </span>
                      <button
                        type="submit"
                        className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 5. ACCOUNT & PROFILE */}
            {activeTab === "account" && (
              <div className="flex flex-col gap-4">
                {currentUser ? (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]">
                          <Icon name="person" size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13.5px] text-[var(--text-primary)] truncate">
                              {currentUser.email}
                            </span>
                            <span className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[10.5px] font-medium text-green-600 dark:text-green-400">
                              <Icon name="verified_user" size={12} /> Active
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                            Account ID: {currentUser.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      You are signed in to your personal sync account. Your notes and collections are automatically synchronized with full row-level isolation.
                    </p>

                    <button
                      onClick={handleSignOut}
                      disabled={isAuthLoading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Icon name="logout" size={15} />
                      <span>{isAuthLoading ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {!url.trim() || !key.trim() ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[11px] text-[var(--text-muted)] flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                          <Icon name="info" size={16} />
                          <span>Supabase Cloud Required</span>
                        </div>
                        <p>
                          To enable cloud accounts and cross-device sync, please set your Supabase Project URL and Anon Key in the Cloud & Sync tab first.
                        </p>
                        <button
                          onClick={() => setActiveTab("sync")}
                          className="self-start rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent-contrast)] hover:opacity-90 cursor-pointer"
                        >
                          Configure Supabase
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex rounded-lg bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signin");
                              setAuthError(null);
                            }}
                            className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors cursor-pointer ${
                              authMode === "signin"
                                ? "bg-[var(--bg-editor)] text-[var(--text-primary)] shadow-2xs font-semibold"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            Sign In
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signup");
                              setAuthError(null);
                            }}
                            className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors cursor-pointer ${
                              authMode === "signup"
                                ? "bg-[var(--bg-editor)] text-[var(--text-primary)] shadow-2xs font-semibold"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            Create Account
                          </button>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-[var(--text-secondary)]">Email</label>
                            <input
                              type="email"
                              required
                              placeholder="you@domain.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-[var(--text-secondary)]">Password</label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                            />
                          </div>

                          {authError && (
                            <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                              <Icon name="error" size={14} />
                              <span>{authError}</span>
                            </div>
                          )}

                          {authSuccess && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <Icon name="check_circle" size={14} />
                              <span>{authSuccess}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isAuthLoading}
                            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                          >
                            <Icon name={authMode === "signin" ? "login" : "person_add"} size={15} />
                            <span>
                              {isAuthLoading
                                ? "Processing..."
                                : authMode === "signin"
                                ? "Sign In"
                                : "Create Account"}
                            </span>
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. DATA & STORAGE */}
            {activeTab === "backup" && (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    Library Export & Import
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Export your notes to portable formats or import existing Markdown and plain text documents.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => onExportAll("markdown")}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-editor)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Icon name="download" size={15} />
                      <span>Export All (Markdown)</span>
                    </button>

                    <button
                      onClick={() => onExportAll("json")}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-editor)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Icon name="database" size={15} />
                      <span>Export Full Backup (JSON)</span>
                    </button>

                    {onImportFile && (
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-editor)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors shadow-2xs">
                        <Icon name="upload_file" size={15} />
                        <span>Import Note File</span>
                        <input
                          type="file"
                          accept=".md,.markdown,.txt,.json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onImportFile(file);
                              onClose();
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Storage architecture info */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 p-4">
                  <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    Local Storage Philosophy
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
                    noted. stores your writing directly in your device's high-speed local IndexedDB database. Everything is instantly available offline with zero latency, zero cloud dependency, and private on-device indexing.
                  </p>
                </div>
              </div>
            )}

            {/* 7. SHORTCUTS DIRECTORY */}
            {activeTab === "shortcuts" && (
              <div className="flex flex-col gap-3">
                {/* Search shortcuts input */}
                <div className="relative flex items-center">
                  <Icon
                    name="search"
                    size={16}
                    className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search shortcuts..."
                    value={shortcutsSearch}
                    onChange={(e) => setShortcutsSearch(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Shortcuts List */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/30 p-2">
                  {filteredShortcuts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                      No shortcuts matching "{shortcutsSearch}"
                    </div>
                  ) : (
                    filteredShortcuts.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2 border-b border-[var(--border-subtle)]/50 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-semibold text-[var(--text-subtle)] tracking-wider w-16">
                            {item.group}
                          </span>
                          <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
                            {item.label}
                          </span>
                        </div>
                        <kbd className="rounded-md bg-white dark:bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] shadow-2xs">
                          {item.key}
                        </kbd>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
