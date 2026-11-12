import { describe, it, expect, beforeEach } from "vitest";
import { settingsService, DEFAULT_PREFERENCES } from "@/services/settingsService";

describe("SettingsService", () => {
  beforeEach(async () => {
    await settingsService.init();
    await settingsService.updatePreferences(DEFAULT_PREFERENCES);
  });

  it("returns default preferences on initial load", () => {
    const prefs = settingsService.getPreferences();
    expect(prefs.fontFamily).toBe("serif");
    expect(prefs.fontSize).toBe("normal");
    expect(prefs.lineHeight).toBe("normal");
    expect(prefs.theme).toBe("system");
    expect(prefs.autoGenerateTitle).toBe(true);
    expect(prefs.slashCommandsEnabled).toBe(true);
  });

  it("updates individual preferences and retains others", async () => {
    await settingsService.updatePreferences({
      fontFamily: "mono",
      fontSize: "large",
    });

    const prefs = settingsService.getPreferences();
    expect(prefs.fontFamily).toBe("mono");
    expect(prefs.fontSize).toBe("large");
    expect(prefs.lineHeight).toBe("normal");
    expect(prefs.theme).toBe("system");
  });

  it("notifies subscribers when preferences change", async () => {
    let notifiedVal: string | null = null;
    const unsub = settingsService.subscribe((p) => {
      notifiedVal = p.fontFamily;
    });

    await settingsService.updatePreferences({ fontFamily: "sans" });
    expect(notifiedVal).toBe("sans");

    unsub();
    await settingsService.updatePreferences({ fontFamily: "serif" });
    expect(notifiedVal).toBe("sans"); // Not called after unsub
  });

  it("toggles editor behaviors cleanly", async () => {
    await settingsService.updatePreferences({
      slashCommandsEnabled: false,
      showWordCount: false,
      noteListDensity: "compact",
    });

    const prefs = settingsService.getPreferences();
    expect(prefs.slashCommandsEnabled).toBe(false);
    expect(prefs.showWordCount).toBe(false);
    expect(prefs.noteListDensity).toBe("compact");
  });
});
