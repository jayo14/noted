import React, { useState, useEffect } from "react";
import type { ThemePreference } from "@/types";
import { authService, type AuthUser } from "@/services/authService";
import {
  X,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Download,
  Database,
  Key,
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

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
}

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
}) => {
  const [activeTab, setActiveTab] = useState<"appearance" | "account" | "sync" | "shortcuts">("appearance");
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex h-[480px] w-full max-w-lg flex-col rounded-xl border border-[var(--border-strong)] bg-[var(--bg-app)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 pt-1">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "appearance"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "account"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "sync"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Synchronisation
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "shortcuts"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Shortcuts
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-[var(--text-primary)]">
          {activeTab === "appearance" && (
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)]">Theme</label>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Choose your interface appearance preference.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onThemeChange("light")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      theme === "light"
                        ? "border-[var(--text-primary)] bg-[var(--bg-surface-active)]"
                        : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <Sun size={18} />
                    <span className="font-medium">Light</span>
                  </button>

                  <button
                    onClick={() => onThemeChange("dark")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      theme === "dark"
                        ? "border-[var(--text-primary)] bg-[var(--bg-surface-active)]"
                        : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <Moon size={18} />
                    <span className="font-medium">Dark</span>
                  </button>

                  <button
                    onClick={() => onThemeChange("system")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      theme === "system"
                        ? "border-[var(--text-primary)] bg-[var(--bg-surface-active)]"
                        : "border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <Monitor size={18} />
                    <span className="font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-4">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Export Library</label>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Save all your notes locally in standard formats.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onExportAll("markdown")}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 py-1.5 font-medium hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <Download size={13} />
                    <span>Export as Markdown</span>
                  </button>
                  <button
                    onClick={() => onExportAll("json")}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 py-1.5 font-medium hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <Database size={13} />
                    <span>Export as JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="flex flex-col gap-4">
              {currentUser ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
                        <UserIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            {currentUser.email}
                          </span>
                          <span className="flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500">
                            <ShieldCheck size={10} /> Active
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate font-mono mt-0.5">
                          ID: {currentUser.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    You are signed in. Your notes and collections will be synchronised quietly to your cloud database with end-to-end user isolation via Row Level Security.
                  </div>

                  <button
                    onClick={handleSignOut}
                    disabled={isAuthLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <LogOut size={13} />
                    <span>{isAuthLoading ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {!url.trim() || !key.trim() ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-[11px] text-[var(--text-muted)] flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 font-medium text-amber-500">
                        <AlertCircle size={14} />
                        <span>Supabase Not Configured</span>
                      </div>
                      <p>
                        To enable cloud synchronisation and personal accounts, please configure your Supabase Project URL and Anon Key in the Synchronisation tab first.
                      </p>
                      <button
                        onClick={() => setActiveTab("sync")}
                        className="self-start rounded bg-[var(--accent)] px-2.5 py-1 text-[10px] font-medium text-[var(--accent-contrast)] hover:opacity-90"
                      >
                        Configure Supabase
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex rounded-md bg-[var(--bg-surface)] p-0.5 border border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signin");
                            setAuthError(null);
                          }}
                          className={`flex-1 py-1 text-center font-medium rounded transition-colors ${
                            authMode === "signin"
                              ? "bg-[var(--bg-app)] text-[var(--text-primary)] shadow-xs"
                              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                          className={`flex-1 py-1 text-center font-medium rounded transition-colors ${
                            authMode === "signup"
                              ? "bg-[var(--bg-app)] text-[var(--text-primary)] shadow-xs"
                              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          Create Account
                        </button>
                      </div>

                      <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-[var(--text-muted)]">Email</label>
                          <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--border-strong)]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-[var(--text-muted)]">Password</label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--border-strong)]"
                          />
                        </div>

                        {authError && (
                          <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                            <AlertCircle size={12} />
                            <span>{authError}</span>
                          </div>
                        )}

                        {authSuccess && (
                          <div className="flex items-center gap-1.5 text-[11px] text-green-500">
                            <ShieldCheck size={12} />
                            <span>{authSuccess}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isAuthLoading}
                          className="mt-1 flex items-center justify-center gap-1.5 rounded bg-[var(--accent)] py-2 font-medium text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50"
                        >
                          {authMode === "signin" ? (
                            <>
                              <LogIn size={13} />
                              <span>{isAuthLoading ? "Signing in..." : "Sign In"}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              <span>{isAuthLoading ? "Creating..." : "Create Account"}</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "sync" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Sync Engine</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {pendingSyncCount > 0
                      ? `${pendingSyncCount} operations queued`
                      : "All changes saved & synced"}
                  </div>
                  {lastSyncedAt && (
                    <div className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
                      Last sync: {new Date(lastSyncedAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex items-center gap-1 rounded bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              </div>

              <form onSubmit={handleConfigSave} className="flex flex-col gap-3">
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                    <Key size={11} />
                    <span>Supabase Project URL</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyz.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--border-strong)]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                    <Key size={11} />
                    <span>Supabase Anon Key</span>
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--border-strong)]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-green-500 font-medium">
                    {isSaved ? "Configuration saved" : ""}
                  </span>
                  <button
                    type="submit"
                    className="rounded bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--accent-contrast)] hover:opacity-90"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">New note</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + N
                </kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Search notes</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + F
                </kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Pin / Unpin note</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + P
                </kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Delete note</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + Shift + D
                </kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Bold / Italic / Underline</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + B / I / U
                </kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Undo / Redo</span>
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] border border-[var(--border-subtle)]">
                  Cmd/Ctrl + Z / Shift + Z
                </kbd>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
