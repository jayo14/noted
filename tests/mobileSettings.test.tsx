import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MobileSettings } from "@/components/mobile/MobileSettings";

describe("MobileSettings Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    theme: "system" as const,
    onThemeChange: () => {},
    pendingSyncCount: 0,
    lastSyncedAt: "2026-11-20T12:00:00Z",
    onTriggerSync: async () => {},
    onExportAll: () => {},
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "test-anon-key",
    onSaveSupabaseConfig: async () => {},
    onImportFile: async () => {},
    onOpenUpdateModal: () => {},
  };

  it("renders full-screen iOS-style grouped settings when open", () => {
    const html = renderToString(<MobileSettings {...defaultProps} />);

    expect(html).toContain("Settings");
    expect(html).toContain("Done");
    expect(html).toContain("Account &amp; Sync");
    expect(html).toContain("Appearance");
    expect(html).toContain("Theme");
    expect(html).toContain("Font");
    expect(html).toContain("Editor Preferences");
    expect(html).toContain("Data &amp; Export");
    expect(html).toContain("About Noted");
    expect(html).toContain("rounded-[22px]");
  });

  it("returns empty string when isOpen is false", () => {
    const html = renderToString(<MobileSettings {...defaultProps} isOpen={false} />);
    expect(html).toBe("");
  });
});
