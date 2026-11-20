import React, { useState, useEffect } from "react";
import type { ThemePreference } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import {
  settingsService,
  type AppPreferences,
  type FontFamily,
  type FontSize,
  type LineHeight,
  type NotesViewMode,
} from "@/services/settingsService";
import {
  checkForUpdates,
  CURRENT_APP_VERSION,
  type UpdateInfo,
} from "@/services/updater";
import {
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Cloud,
  RefreshCw,
  User,
  Download,
  Upload,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Sliders,
  Type,
  FolderDown,
} from "lucide-react";

export interface MobileSettingsProps {
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
  onOpenUpdateModal?: (info: UpdateInfo) => void;
}

export const MobileSettings: React.FC<MobileSettingsProps> = ({
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
  onOpenUpdateModal,
}) => {
  const [prefs, setPrefs] = useState<AppPreferences>(settingsService.getPreferences());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Cloud config state
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseKey);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);

  // Auth form state
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Updates state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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

  const updatePref = <K extends keyof AppPreferences>(k: K, value: AppPreferences[K]) => {
    settingsService.updatePreferences({ [k]: value });
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
          setShowAuthForm(false);
        }
      } else {
        const { user, error } = await authService.signUp(email.trim(), password);
        if (error) {
          setAuthError(error);
        } else if (user) {
          setAuthSuccess("Account created successfully!");
          setEmail("");
          setPassword("");
          setShowAuthForm(false);
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

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const info = await checkForUpdates({ force: true });
      if (info && info.available) {
        setUpdateStatus(`Update ${info.tagName} available!`);
        if (onOpenUpdateModal) {
          onOpenUpdateModal(info);
        }
      } else {
        setUpdateStatus(`You are using the latest version (v${CURRENT_APP_VERSION}).`);
      }
    } catch {
      setUpdateStatus("Could not check updates. Check internet.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F2F2F7] dark:bg-[#000000] text-[var(--text-primary)] select-none animate-in fade-in duration-150">
      {/* Top Header Bar with safe area padding */}
      <header className="flex h-[calc(3.75rem+env(safe-area-inset-top,0px))] pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] px-4 pb-2 w-full items-center justify-between flex-shrink-0 z-20">
        {/* Left: Circular back button */}
        <button
          onClick={onClose}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>

        {/* Center: Title */}
        <h1 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
          Settings
        </h1>

        {/* Right: Golden Done button */}
        <button
          onClick={onClose}
          className="flex h-9 items-center justify-center rounded-full bg-[#f4b300] hover:bg-[#e0a400] text-white px-4 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          aria-label="Done"
        >
          Done
        </button>
      </header>

      {/* Scrollable Content Body with safe area bottom */}
      <div className="flex-1 overflow-y-auto px-4 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] space-y-6 no-scrollbar pt-2">
        {/* 1. Account & Sync Inset Grouped Card */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Account & Sync
          </div>
          <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
            {currentUser ? (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#f4b300]/15 text-[#f4b300] font-bold text-base">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                      {currentUser.email}
                    </div>
                    <div className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={13} />
                      <span>Cloud Sync Active</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={isAuthLoading}
                  className="rounded-full bg-black/5 dark:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 active:scale-95 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[var(--text-primary)]">
                        Sign In with Cloud
                      </div>
                      <div className="text-[12px] text-[var(--text-muted)]">
                        Sync your notes seamlessly across all devices
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAuthForm((prev) => !prev)}
                    className="rounded-full bg-[#f4b300] text-white px-3.5 py-1.5 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    {showAuthForm ? "Hide" : "Sign In"}
                  </button>
                </div>

                {/* Inline Auth Form */}
                {showAuthForm && (
                  <form onSubmit={handleAuthSubmit} className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
                    <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode("signin")}
                        className={`flex-1 rounded-full py-1 text-xs font-semibold transition-all ${
                          authMode === "signin"
                            ? "bg-white dark:bg-[#2C2C2E] text-[var(--text-primary)] shadow-xs"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode("signup")}
                        className={`flex-1 rounded-full py-1 text-xs font-semibold transition-all ${
                          authMode === "signup"
                            ? "bg-white dark:bg-[#2C2C2E] text-[var(--text-primary)] shadow-xs"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Create Account
                      </button>
                    </div>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full rounded-xl bg-black/5 dark:bg-white/5 px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-xl bg-black/5 dark:bg-white/5 px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none"
                    />

                    {authError && (
                      <div className="text-[12px] text-red-500 font-medium px-1">
                        {authError}
                      </div>
                    )}
                    {authSuccess && (
                      <div className="text-[12px] text-emerald-500 font-medium px-1">
                        {authSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full rounded-full bg-[#f4b300] hover:bg-[#e0a400] text-white py-2.5 text-xs font-bold active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isAuthLoading ? "Please wait..." : authMode === "signin" ? "Sign In" : "Register"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Sync trigger row */}
            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                  <RefreshCw size={17} className={isSyncing ? "animate-spin text-[#f4b300]" : ""} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                    Synchronize
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    {pendingSyncCount > 0
                      ? `${pendingSyncCount} pending changes`
                      : lastSyncedAt
                      ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                      : "Ready to sync"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSyncClick}
                disabled={isSyncing}
                className="rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Appearance & Theme Inset Grouped Card */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Appearance
          </div>
          <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
            {/* Theme Picker Segmented Control */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sun size={18} className="text-[var(--text-muted)]" />
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">Theme</span>
              </div>

              <div className="flex rounded-full bg-black/5 dark:bg-white/10 p-1">
                {(
                  [
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "Auto", icon: Monitor },
                  ] as const
                ).map((t) => {
                  const IconComp = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-[#2C2C2E] text-[var(--text-primary)] shadow-xs"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      <IconComp size={13} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Font Family */}
            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Type size={18} className="text-[var(--text-muted)]" />
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">Font</span>
              </div>

              <div className="flex rounded-full bg-black/5 dark:bg-white/10 p-1">
                {(
                  [
                    { id: "sans", label: "Sans" },
                    { id: "serif", label: "Serif" },
                    { id: "mono", label: "Mono" },
                  ] as const
                ).map((f) => {
                  const isActive = prefs.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => updatePref("fontFamily", f.id as FontFamily)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-[#2C2C2E] text-[var(--text-primary)] shadow-xs"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size */}
            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] ml-7">Size</span>

              <div className="flex rounded-full bg-black/5 dark:bg-white/10 p-1">
                {(["compact", "normal", "large"] as FontSize[]).map((s) => {
                  const isActive = prefs.fontSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updatePref("fontSize", s)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-[#2C2C2E] text-[var(--text-primary)] shadow-xs"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Writing & Editor Controls Inset Grouped Card */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Editor Preferences
          </div>
          <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
            {/* Auto Generate Title */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Auto-Detect Note Title
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  Derives note title from first line automatically
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.autoGenerateTitle}
                onChange={(e) => updatePref("autoGenerateTitle", e.target.checked)}
                className="h-6 w-11 rounded-full appearance-none bg-black/10 dark:bg-white/20 checked:bg-[#f4b300] relative cursor-pointer transition-colors duration-200 before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-xs before:transition-transform before:duration-200 checked:before:translate-x-5"
              />
            </div>

            {/* Spell Check */}
            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Spell Check
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  Highlight typos and spelling suggestions
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.spellCheck}
                onChange={(e) => updatePref("spellCheck", e.target.checked)}
                className="h-6 w-11 rounded-full appearance-none bg-black/10 dark:bg-white/20 checked:bg-[#f4b300] relative cursor-pointer transition-colors duration-200 before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-xs before:transition-transform before:duration-200 checked:before:translate-x-5"
              />
            </div>

            {/* Smart Punctuation */}
            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Smart Typographic Quotes
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  Converts straight quotes to curly quotes
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.smartPunctuation}
                onChange={(e) => updatePref("smartPunctuation", e.target.checked)}
                className="h-6 w-11 rounded-full appearance-none bg-black/10 dark:bg-white/20 checked:bg-[#f4b300] relative cursor-pointer transition-colors duration-200 before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-xs before:transition-transform before:duration-200 checked:before:translate-x-5"
              />
            </div>
          </div>
        </div>

        {/* 4. Data & Backups Inset Grouped Card */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Data & Export
          </div>
          <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
            <button
              onClick={() => onExportAll("markdown")}
              className="w-full p-4 flex items-center justify-between text-left active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                  <Download size={17} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                    Export All as Markdown
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    Download complete archive of notes in .zip format
                  </div>
                </div>
              </div>
            </button>

            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <button
              onClick={() => onExportAll("json")}
              className="w-full p-4 flex items-center justify-between text-left active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                  <FolderDown size={17} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                    Export All as JSON
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    Full structured backup with revision history
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 5. Custom Cloud Database Settings (Optional) */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
            <span>Cloud Database</span>
            <button
              onClick={() => setShowCloudConfig((prev) => !prev)}
              className="text-[12px] font-semibold text-[#f4b300] cursor-pointer"
            >
              {showCloudConfig ? "Hide" : "Configure"}
            </button>
          </div>
          {showCloudConfig && (
            <form onSubmit={handleConfigSave} className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs p-4 space-y-3">
              <div>
                <label className="text-[12px] font-medium text-[var(--text-muted)]">Supabase URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/5 px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[var(--text-muted)]">Anon Key</label>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/5 px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#f4b300] hover:bg-[#e0a400] text-white py-2 text-xs font-bold active:scale-98 transition-all cursor-pointer"
              >
                {isSaved ? "Saved!" : "Save Cloud Config"}
              </button>
            </form>
          )}
        </div>

        {/* 6. About & Updates Inset Grouped Card */}
        <div className="space-y-1.5">
          <div className="px-1 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            About Noted
          </div>
          <div className="w-full rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Version
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  v{CURRENT_APP_VERSION} (Build 4)
                </div>
              </div>

              <button
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdate}
                className="flex items-center gap-1.5 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={13} className={isCheckingUpdate ? "animate-spin text-[#f4b300]" : "text-[#f4b300]"} />
                <span>{isCheckingUpdate ? "Checking..." : "Check Updates"}</span>
              </button>
            </div>

            {updateStatus && (
              <div className="px-4 pb-3 text-[12px] text-[var(--text-muted)] font-medium">
                {updateStatus}
              </div>
            )}

            <div className="ml-4 border-t border-black/[0.06] dark:border-white/[0.08]" />
            <a
              href="https://github.com/jayo14/noted"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between active:bg-black/5 dark:active:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                GitHub Repository
              </div>
              <ExternalLink size={15} className="text-[var(--text-muted)]" />
            </a>
          </div>

          <div className="pt-2 text-center text-[12px] text-[var(--text-muted)] leading-relaxed">
            Local-first note-taking engine for focus and clarity.
            <br />
            Crafted for speed and simplicity.
          </div>
        </div>
      </div>
    </div>
  );
};
