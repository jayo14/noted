import { describe, it, expect } from "vitest";
import {
  jsonContentToMarkdown,
  jsonContentToPlainText,
  markdownToJSONContent,
  plainTextToJSONContent,
} from "../src/lib/export";
import type { JSONContent } from "@tiptap/core";

describe("Export & Import Utilities", () => {
  it("converts rich-text JSON content to markdown format", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Architecture Plan" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            { type: "text", marks: [{ type: "bold" }], text: "bold" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "italic" },
            { type: "text", text: "." },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Done item" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Pending item" }] }],
            },
          ],
        },
      ],
    };

    const markdown = jsonContentToMarkdown(content);
    expect(markdown).toContain("# Architecture Plan");
    expect(markdown).toContain("**bold**");
    expect(markdown).toContain("*italic*");
    expect(markdown).toContain("- [x] Done item");
    expect(markdown).toContain("- [ ] Pending item");
  });

  it("converts rich-text JSON content to plain text", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First line" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second line" }],
        },
      ],
    };

    const plainText = jsonContentToPlainText(content);
    expect(plainText).toContain("First line");
    expect(plainText).toContain("Second line");
  });

  it("parses markdown text into structured Tiptap JSONContent", () => {
    const md = `# Project Requirements\n\n- [x] Local storage\n- [ ] Cloud sync\n\n> Simple is better.`;
    const parsed = markdownToJSONContent(md);

    expect(parsed.title).toBe("Project Requirements");
    expect(parsed.content.type).toBe("doc");
    expect(parsed.content.content).toBeDefined();

    const nodes = parsed.content.content || [];
    expect(nodes.some((n) => n.type === "heading")).toBe(true);
    expect(nodes.some((n) => n.type === "taskList")).toBe(true);
    expect(nodes.some((n) => n.type === "blockquote")).toBe(true);
  });

  it("parses plain text into structured Tiptap JSONContent with title extraction", () => {
    const raw = `Grocery List\nApples\nBananas\nAlmond Milk`;
    const parsed = plainTextToJSONContent(raw);

    expect(parsed.title).toBe("Grocery List");
    expect(parsed.content.type).toBe("doc");
    expect(parsed.content.content?.length).toBe(4);
  });
});
