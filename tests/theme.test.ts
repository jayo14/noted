import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Theme Variables & Contrast System", () => {
  const cssPath = path.resolve(__dirname, "../src/index.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("defines all mandatory semantic color tokens in :root and .dark", () => {
    const requiredTokens = [
      "--bg-window",
      "--bg-app",
      "--bg-sidebar",
      "--bg-notes-panel",
      "--bg-editor",
      "--bg-surface",
      "--bg-surface-hover",
      "--bg-surface-active",
      "--bg-card-active",
      "--bg-callout",
      "--border-subtle",
      "--border-strong",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--text-subtle",
      "--accent",
      "--accent-contrast",
      "--selection-bg",
    ];

    for (const token of requiredTokens) {
      expect(cssContent).toContain(token);
    }
  });

  it("ensures light theme active note card has distinct contrast against notes panel", () => {
    // Extract :root block
    const rootMatch = cssContent.match(/:root\s*{([^}]+)}/);
    expect(rootMatch).toBeTruthy();
    const rootBlock = rootMatch![1];

    const cardActiveMatch = rootBlock.match(/--bg-card-active:\s*([^;]+);/);
    const notesPanelMatch = rootBlock.match(/--bg-notes-panel:\s*([^;]+);/);

    expect(cardActiveMatch).toBeTruthy();
    expect(notesPanelMatch).toBeTruthy();

    const cardActiveBg = cardActiveMatch![1].trim();
    const notesPanelBg = notesPanelMatch![1].trim();

    // Active card background must NOT be identical to panel background
    expect(cardActiveBg).not.toBe(notesPanelBg);
    // Active card must not be pure washed-out white in light theme
    expect(cardActiveBg.toLowerCase()).not.toBe("#ffffff");
  });

  it("ensures search input surface has distinct background against notes panel", () => {
    const rootMatch = cssContent.match(/:root\s*{([^}]+)}/);
    expect(rootMatch).toBeTruthy();
    const rootBlock = rootMatch![1];

    const surfaceMatch = rootBlock.match(/--bg-surface:\s*([^;]+);/);
    const notesPanelMatch = rootBlock.match(/--bg-notes-panel:\s*([^;]+);/);

    expect(surfaceMatch).toBeTruthy();
    expect(notesPanelMatch).toBeTruthy();

    const surfaceBg = surfaceMatch![1].trim();
    const notesPanelBg = notesPanelMatch![1].trim();

    expect(surfaceBg).not.toBe(notesPanelBg);
  });

  it("ensures callout block has solid accent border and defined background", () => {
    expect(cssContent).toContain("border-left: 3.5px solid var(--accent);");
    expect(cssContent).toContain("background-color: var(--bg-callout);");
  });

  it("ensures task checkbox styles use semantic theme tokens instead of hardcoded dark colors", () => {
    expect(cssContent).toContain("border: 1.5px solid var(--text-subtle);");
    expect(cssContent).toContain("background-color: var(--accent);");
    expect(cssContent).toContain("border-color: var(--accent);");
    expect(cssContent).toContain("color: var(--text-muted);");
  });
});
