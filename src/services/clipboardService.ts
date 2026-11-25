import { getStorageAdapter } from "@/lib/storage";
import type {
  ClipboardCategory,
  ClipboardContentType,
  ClipboardItem,
} from "@/types";

export interface IncomingClipboardPayload {
  contentType: ClipboardContentType;
  contentText: string;
  contentHtml: string | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  contentHash: string;
}

const CLI_PREFIXES = [
  "git ", "pnpm ", "npm ", "npx ", "yarn ", "bun ", "cargo ", "rustc ",
  "docker ", "docker-compose ", "kubectl ", "sudo ", "apt ", "pacman ",
  "dnf ", "systemctl ", "curl ", "wget ", "ssh ", "scp ", "cd ", "ls ",
  "mkdir ", "rm ", "cp ", "mv ", "cat ", "grep ", "rg ", "find ", "chmod ",
  "python ", "python3 ", "node ", "tauri ", "vite ", "vitest ",
];

export function classifyClipboardContent(
  contentType: ClipboardContentType,
  text: string,
): ClipboardCategory {
  if (contentType === "image") return "image";

  const trimmed = text.trim();
  if (!trimmed) return contentType === "html" ? "rich_text" : "text";

  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return "url";
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "email";
  }

  if (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)$/i.test(trimmed) ||
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*[\d.]+)?\s*\)$/i.test(trimmed)
  ) {
    return "color";
  }

  const lower = trimmed.toLowerCase();
  const lineCount = trimmed.split("\n").length;
  if (lineCount <= 3 && CLI_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return "command";
  }

  if (
    /\b(function|const|let|var|import|export|interface|type|class|async|await|return|pub fn|fn |def |SELECT\s+.+FROM|CREATE TABLE)\b/.test(
      trimmed,
    ) ||
    (lineCount >= 2 && /[{};()=>]/.test(trimmed))
  ) {
    return "code";
  }

  if (contentType === "html") {
    return "rich_text";
  }

  return "text";
}

export function sanitizeClipboardHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|form|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|meta|link)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let cachedSupportPromise: Promise<boolean> | null = null;

export async function isLinuxClipboardSupported(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  if (!cachedSupportPromise) {
    cachedSupportPromise = (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        return await invoke<boolean>("is_linux_clipboard_supported");
      } catch {
        return false;
      }
    })();
  }
  return cachedSupportPromise;
}

async function deleteImageFile(imagePath: string | null | undefined): Promise<void> {
  if (!imagePath || !isTauriRuntime()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clipboard_delete_image", { imagePath });
  } catch (err) {
    console.warn("[ClipboardService] Failed to delete image file:", err);
  }
}

export const clipboardService = {
  async getHistory(limit = 500): Promise<ClipboardItem[]> {
    const storage = await getStorageAdapter();
    if (!storage.getClipboardHistory) return [];
    return storage.getClipboardHistory(limit);
  },

  async searchHistory(query: string, limit = 200): Promise<ClipboardItem[]> {
    const storage = await getStorageAdapter();
    if (!storage.searchClipboardHistory) return [];
    return storage.searchClipboardHistory(query, limit);
  },

  async recordIncomingItem(payload: IncomingClipboardPayload): Promise<ClipboardItem | null> {
    const storage = await getStorageAdapter();
    if (!storage.upsertClipboardItem) return null;

    const category = classifyClipboardContent(payload.contentType, payload.contentText);
    const { item, prunedImagePaths } = await storage.upsertClipboardItem(
      {
        content_type: payload.contentType,
        content_text: payload.contentText,
        content_html: payload.contentHtml,
        image_path: payload.imagePath,
        image_width: payload.imageWidth,
        image_height: payload.imageHeight,
        content_hash: payload.contentHash,
        category,
      },
      500,
    );

    if (prunedImagePaths.length > 0) {
      await Promise.all(prunedImagePaths.map((p) => deleteImageFile(p)));
    }

    return item;
  },

  async copyToSystem(item: ClipboardItem): Promise<ClipboardItem | null> {
    if (isTauriRuntime()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clipboard_write_item", {
        contentType: item.content_type,
        contentText: item.content_text,
        contentHtml: item.content_html,
        imagePath: item.image_path,
      });
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.content_text);
    }

    const storage = await getStorageAdapter();
    if (!storage.upsertClipboardItem) return item;

    const { item: updated } = await storage.upsertClipboardItem(
      {
        content_type: item.content_type,
        content_text: item.content_text,
        content_html: item.content_html,
        image_path: item.image_path,
        image_width: item.image_width,
        image_height: item.image_height,
        content_hash: item.content_hash,
        category: item.category,
      },
      500,
    );
    return updated;
  },

  async togglePin(id: string): Promise<ClipboardItem | null> {
    const storage = await getStorageAdapter();
    if (!storage.toggleClipboardPin) return null;
    return storage.toggleClipboardPin(id);
  },

  async deleteItem(id: string): Promise<void> {
    const storage = await getStorageAdapter();
    if (!storage.deleteClipboardItem) return;
    const imagePath = await storage.deleteClipboardItem(id);
    await deleteImageFile(imagePath);
  },

  async clearUnpinned(): Promise<void> {
    const storage = await getStorageAdapter();
    if (!storage.clearUnpinnedClipboard) return;
    const imagePaths = await storage.clearUnpinnedClipboard();
    if (imagePaths.length > 0) {
      await Promise.all(imagePaths.map((p) => deleteImageFile(p)));
    }
  },

  async setPaused(paused: boolean): Promise<boolean> {
    if (!isTauriRuntime()) return paused;
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("clipboard_set_paused", { paused });
  },

  async isPaused(): Promise<boolean> {
    if (!isTauriRuntime()) return false;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<boolean>("clipboard_is_paused");
    } catch {
      return false;
    }
  },
};
