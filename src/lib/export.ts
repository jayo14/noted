import type { JSONContent } from "@tiptap/core";
import type { Note } from "@/types";

export function jsonContentToMarkdown(content: JSONContent): string {
  if (!content) return "";

  function serializeNode(node: JSONContent): string {
    if (!node) return "";

    // Text node with marks
    if (node.type === "text" && node.text) {
      let text = node.text;
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `**${text}**`;
          else if (mark.type === "italic") text = `*${text}*`;
          else if (mark.type === "strike") text = `~~${text}~~`;
          else if (mark.type === "code") text = `\`${text}\``;
          else if (mark.type === "underline") text = `<u>${text}</u>`;
          else if (mark.type === "highlight") text = `==${text}==`;
          else if (mark.type === "link" && mark.attrs?.href) text = `[${text}](${mark.attrs.href})`;
        }
      }
      return text;
    }

    const children = (node.content || []).map(serializeNode).join("");

    switch (node.type) {
      case "doc":
        return (node.content || []).map(serializeNode).join("\n\n");
      case "paragraph":
        return children;
      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level);
        return `${prefix} ${children}`;
      }
      case "blockquote":
        return children
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      case "codeBlock":
        return `\`\`\`${node.attrs?.language || ""}\n${children}\n\`\`\``;
      case "horizontalRule":
        return "---";
      case "bulletList":
        return (node.content || []).map(serializeNode).join("\n");
      case "orderedList":
        return (node.content || []).map(serializeNode).join("\n");
      case "listItem":
        return `- ${children.trim()}`;
      case "taskList":
        return (node.content || []).map(serializeNode).join("\n");
      case "taskItem": {
        const checked = node.attrs?.checked ? "[x]" : "[ ]";
        return `- ${checked} ${children.trim()}`;
      }
      default:
        return children;
    }
  }

  return serializeNode(content).trim();
}

export function jsonContentToPlainText(content: JSONContent): string {
  if (!content) return "";

  function extract(node: JSONContent): string {
    if (node.text) return node.text;
    if (!node.content) return "";
    return node.content.map(extract).join(node.type === "paragraph" || node.type === "heading" ? "\n" : "");
  }

  return extract(content).trim();
}

export function exportNoteAsFile(note: Note, format: "markdown" | "txt"): void {
  const content =
    format === "markdown"
      ? `# ${note.title}\n\n${jsonContentToMarkdown(note.content)}`
      : `${note.title}\n\n${jsonContentToPlainText(note.content)}`;

  const mime = format === "markdown" ? "text/markdown" : "text/plain";
  const ext = format === "markdown" ? "md" : "txt";
  const filename = `${note.title.replace(/[^a-z0-9_-]/gi, "_") || "note"}.${ext}`;

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Converts standard Markdown text into Tiptap structured JSONContent.
 */
export function markdownToJSONContent(markdown: string): { title: string; content: JSONContent } {
  if (!markdown || !markdown.trim()) {
    return {
      title: "Untitled",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    };
  }

  const lines = markdown.split(/\r?\n/);
  const contentNodes: JSONContent[] = [];
  let extractedTitle: string | null = null;
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        contentNodes.push({
          type: "codeBlock",
          attrs: { language: codeBlockLang },
          content: codeBlockLines.length > 0 ? [{ type: "text", text: codeBlockLines.join("\n") }] : [],
        });
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (!extractedTitle && level === 1) {
        extractedTitle = text;
      }
      contentNodes.push({
        type: "heading",
        attrs: { level },
        content: [{ type: "text", text }],
      });
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      contentNodes.push({ type: "horizontalRule" });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const text = line.replace(/^>\s?/, "").trim();
      contentNodes.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });
      continue;
    }

    // Task list items
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const text = taskMatch[2].trim();
      contentNodes.push({
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked },
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
        ],
      });
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      const text = bulletMatch[1].trim();
      contentNodes.push({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
        ],
      });
      continue;
    }

    // Ordered list items
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const text = orderedMatch[1].trim();
      contentNodes.push({
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
        ],
      });
      continue;
    }

    // Standard paragraph
    if (!extractedTitle) {
      extractedTitle = line.trim();
    }
    contentNodes.push({
      type: "paragraph",
      content: [{ type: "text", text: line.trim() }],
    });
  }

  // If still inside code block at EOF
  if (inCodeBlock) {
    contentNodes.push({
      type: "codeBlock",
      attrs: { language: codeBlockLang },
      content: codeBlockLines.length > 0 ? [{ type: "text", text: codeBlockLines.join("\n") }] : [],
    });
  }

  if (contentNodes.length === 0) {
    contentNodes.push({ type: "paragraph" });
  }

  return {
    title: extractedTitle || "Untitled",
    content: {
      type: "doc",
      content: contentNodes,
    },
  };
}

/**
 * Converts raw plain text into Tiptap structured JSONContent.
 */
export function plainTextToJSONContent(text: string): { title: string; content: JSONContent } {
  if (!text || !text.trim()) {
    return {
      title: "Untitled",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const title = lines[0]?.trim() || "Untitled";

  const paragraphs: JSONContent[] = lines.map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }],
  }));

  return {
    title,
    content: {
      type: "doc",
      content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
    },
  };
}

/**
 * Reads a File object and extracts title and JSONContent.
 */
export async function parseImportFile(file: File): Promise<{ title: string; content: JSONContent }> {
  const text = await file.text();

  if (file.name.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.content && parsed.title) {
        return { title: parsed.title, content: parsed.content };
      }
      if (parsed.type === "doc") {
        return { title: file.name.replace(/\.json$/i, ""), content: parsed };
      }
    } catch {
      // Fallback to text parsing
    }
  }

  if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
    const result = markdownToJSONContent(text);
    return {
      title: result.title !== "Untitled" ? result.title : file.name.replace(/\.(md|markdown)$/i, ""),
      content: result.content,
    };
  }

  return plainTextToJSONContent(text);
}
