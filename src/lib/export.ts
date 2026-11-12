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
