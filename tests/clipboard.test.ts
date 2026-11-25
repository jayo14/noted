import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyClipboardContent,
  sanitizeClipboardHtml,
  clipboardService,
} from "@/services/clipboardService";
import { getStorageAdapter } from "@/lib/storage";

describe("Linux Persistent Clipboard Service", () => {
  beforeEach(async () => {
    const storage = await getStorageAdapter();
    await storage.clearAllData();
  });

  it("classifies clipboard content accurately", () => {
    expect(classifyClipboardContent("image", "Image (800x600)")).toBe("image");
    expect(classifyClipboardContent("text", "https://tauri.app/v2/")).toBe("url");
    expect(classifyClipboardContent("text", "ayobamidayo2007@gmail.com")).toBe("email");
    expect(classifyClipboardContent("text", "#faf6f2")).toBe("color");
    expect(classifyClipboardContent("text", "rgb(20, 19, 18)")).toBe("color");
    expect(classifyClipboardContent("text", "git commit -m 'feat: clipboard'")).toBe("command");
    expect(classifyClipboardContent("text", "const x = () => 42;")).toBe("code");
    expect(classifyClipboardContent("html", "Hello world")).toBe("rich_text");
    expect(classifyClipboardContent("text", "Just a plain note snippet")).toBe("text");
  });

  it("sanitizes unsafe HTML while preserving formatting", () => {
    const dirty =
      '<p onclick="alert(1)">Hello <strong>world</strong></p><script>evil()</script><a href="javascript:void(0)">Link</a>';
    const clean = sanitizeClipboardHtml(dirty);
    expect(clean).toContain("<strong>world</strong>");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
  });

  it("deduplicates identical copies by contentHash", async () => {
    await clipboardService.recordIncomingItem({
      contentType: "text",
      contentText: "pnpm test",
      contentHtml: null,
      imagePath: null,
      imageWidth: null,
      imageHeight: null,
      contentHash: "hash-1",
    });

    await clipboardService.recordIncomingItem({
      contentType: "text",
      contentText: "pnpm test",
      contentHtml: null,
      imagePath: null,
      imageWidth: null,
      imageHeight: null,
      contentHash: "hash-1",
    });

    const history = await clipboardService.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].category).toBe("command");
  });

  it("preserves pinned items and prunes unpinned items beyond 500", async () => {
    const pinned = await clipboardService.recordIncomingItem({
      contentType: "text",
      contentText: "Important API key note",
      contentHtml: null,
      imagePath: null,
      imageWidth: null,
      imageHeight: null,
      contentHash: "pinned-hash",
    });
    expect(pinned).not.toBeNull();
    await clipboardService.togglePin(pinned!.id);

    const storage = await getStorageAdapter();
    for (let i = 0; i < 505; i++) {
      await storage.upsertClipboardItem!(
        {
          content_type: "text",
          content_text: `Clip item ${i}`,
          content_html: null,
          image_path: null,
          image_width: null,
          image_height: null,
          content_hash: `hash-${i}`,
          category: "text",
        },
        500,
      );
    }

    const history = await clipboardService.getHistory(600);
    const unpinnedCount = history.filter((h) => !h.is_pinned).length;
    const hasPinned = history.some((h) => h.id === pinned!.id && h.is_pinned);

    expect(unpinnedCount).toBe(500);
    expect(hasPinned).toBe(true);
  });

  it("searches history and clears only unpinned items", async () => {
    const itemA = await clipboardService.recordIncomingItem({
      contentType: "text",
      contentText: "https://github.com/jayo14/noted",
      contentHtml: null,
      imagePath: null,
      imageWidth: null,
      imageHeight: null,
      contentHash: "url-hash",
    });
    await clipboardService.recordIncomingItem({
      contentType: "image",
      contentText: "Image (1920x1080)",
      contentHtml: null,
      imagePath: "/tmp/test.png",
      imageWidth: 1920,
      imageHeight: 1080,
      contentHash: "img-hash",
    });

    await clipboardService.togglePin(itemA!.id);

    const searchResults = await clipboardService.searchHistory("github");
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe(itemA!.id);

    await clipboardService.clearUnpinned();
    const remaining = await clipboardService.getHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(itemA!.id);
  });
});
