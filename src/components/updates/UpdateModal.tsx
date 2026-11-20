import React, { useState } from "react";
import {
  type UpdateInfo,
  formatBytes,
  formatReleaseDate,
  openUpdate,
  dismissUpdate,
} from "@/services/updater";
import { Download, ExternalLink, X, Sparkles, CheckCircle2 } from "lucide-react";

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
  isManualCheck?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
  isManualCheck = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    try {
      await openUpdate(updateInfo);
      setDownloadStarted(true);
    } catch (err) {
      console.error("[Updater] Error opening update:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    if (updateInfo) {
      dismissUpdate(updateInfo.tagName);
    }
    onClose();
  };

  // If no update is available (e.g. manual check when already up to date)
  if (!updateInfo || !updateInfo.available) {
    if (!isManualCheck) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-editor)] p-5 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              You're Up to Date
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Noted v{updateInfo?.currentVersion || "0.1.4"} is currently the latest version.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] py-2 text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer active:scale-98"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-editor)] p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header with Feather Quill Brand */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Update Available
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20">
                <Sparkles size={11} />
                {updateInfo.tagName}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Current: v{updateInfo.currentVersion} • Published {formatReleaseDate(updateInfo.publishedAt)}
              {updateInfo.assetSize && !updateInfo.isPlayStore ? ` • ${formatBytes(updateInfo.assetSize)}` : ""}
            </p>
          </div>
        </div>

        {/* Release Notes */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-3.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-1 text-[11px] uppercase tracking-wider">
            What's New in {updateInfo.tagName}
          </div>
          <div className="whitespace-pre-wrap font-sans text-[12px] opacity-90 select-text">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {downloadStarted && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-500">
            <CheckCircle2 size={15} />
            <span>
              {updateInfo.isPlayStore
                ? "Opening Google Play Store to complete the update..."
                : "Download started! Tap the downloaded file or notification to install."}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] hover:opacity-90 active:scale-98 text-[var(--accent-contrast)] py-2.5 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {updateInfo.isPlayStore ? <ExternalLink size={15} /> : <Download size={15} />}
            <span>
              {updateInfo.isPlayStore
                ? "Update on Google Play"
                : isUpdating
                ? "Starting Download..."
                : `Download & Update (${updateInfo.tagName})`}
            </span>
          </button>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-xl bg-transparent hover:bg-[var(--bg-surface)] py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
            >
              Later
            </button>

            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Release Notes</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
