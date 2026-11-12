import { describe, it, expect, beforeEach } from "vitest";
import { settingsService, DEFAULT_PREFERENCES } from "@/services/settingsService";

describe("View Mode Preferences & Layout", () => {
  beforeEach(async () => {
    await settingsService.resetToDefaults();
  });

  it("defaults notesViewMode to 'list'", () => {
    const prefs = settingsService.getPreferences();
    expect(prefs.notesViewMode).toBe("list");
  });

  it("persists updating notesViewMode to 'grid'", async () => {
    let receivedMode = "";
    const unsub = settingsService.subscribe((p) => {
      receivedMode = p.notesViewMode;
    });

    await settingsService.updatePreferences({ notesViewMode: "grid" });

    expect(receivedMode).toBe("grid");
    expect(settingsService.getPreferences().notesViewMode).toBe("grid");

    unsub();
  });

  it("can toggle between list and grid seamlessly", async () => {
    expect(settingsService.getPreferences().notesViewMode).toBe("list");

    await settingsService.updatePreferences({ notesViewMode: "grid" });
    expect(settingsService.getPreferences().notesViewMode).toBe("grid");

    await settingsService.updatePreferences({ notesViewMode: "list" });
    expect(settingsService.getPreferences().notesViewMode).toBe("list");
  });
});
