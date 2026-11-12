import React, { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowHeaderProps {
  onOpenSettings?: () => void;
  title?: string;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({ title = "Notes" }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {}
  };

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch {}
  };

  return (
    <header
      data-tauri-drag-region
      className="flex h-11 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-4 select-none"
    >
      {/* macOS Traffic Lights + Brand */}
      <div className="flex items-center gap-4">
        {/* Traffic Light Buttons */}
        <div
          className="flex items-center gap-2 group/lights py-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Close (Red) */}
          <button
            onClick={handleClose}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F56] border border-[#E0443E] transition-transform active:scale-90 cursor-pointer shadow-xs"
            title="Close"
            aria-label="Close"
          >
            <svg
              className={`h-1.5 w-1.5 text-[#4D0000] transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              viewBox="0 0 24 24"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Minimize (Yellow) */}
          <button
            onClick={handleMinimize}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-[#FFBD2E] border border-[#DEA123] transition-transform active:scale-90 cursor-pointer shadow-xs"
            title="Minimize"
            aria-label="Minimize"
          >
            <svg
              className={`h-1.5 w-1.5 text-[#664D00] transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              viewBox="0 0 24 24"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Zoom / Fullscreen (Green) */}
          <button
            onClick={handleMaximize}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-[#27C93F] border border-[#1AAB29] transition-transform active:scale-90 cursor-pointer shadow-xs"
            title="Maximize"
            aria-label="Maximize"
          >
            <svg
              className={`h-1.5 w-1.5 text-[#004D11] transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              viewBox="0 0 24 24"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
            </svg>
          </button>
        </div>

        {/* Brand squircle & title */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#141312] text-white shadow-xs">
            <span className="text-[10px] font-bold tracking-tighter leading-none">N</span>
          </div>
          <span className="text-[13px] font-medium tracking-tight text-[var(--text-primary)]">
            {title}
          </span>
        </div>
      </div>

      {/* Subtle window title in center for macOS feel */}
      <div className="text-[12px] font-medium text-[var(--text-muted)] pointer-events-none">
        noted.
      </div>

      {/* Spacer to keep center balanced */}
      <div className="w-16" />
    </header>
  );
};
