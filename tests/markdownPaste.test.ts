import { describe, it, expect } from "vitest";
import { isMarkdownText, markdownToTipTapHtml } from "@/lib/markdownPaste";

describe("Markdown Paste Detection & Auto-formatting", () => {
  describe("isMarkdownText", () => {
    it("detects ATX headings", () => {
      expect(isMarkdownText("# Heading 1")).toBe(true);
      expect(isMarkdownText("### Subheading with text")).toBe(true);
      expect(isMarkdownText("#notaheading")).toBe(false);
    });

    it("detects task lists and checklist items", () => {
      expect(isMarkdownText("- [ ] Plan architecture\n- [x] Write tests")).toBe(true);
      expect(isMarkdownText("* [ ] Single task item")).toBe(true);
    });

    it("detects bold, italic, and strikethrough", () => {
      expect(isMarkdownText("This is **very important** notes.")).toBe(true);
      expect(isMarkdownText("This is ~~deprecated~~ syntax.")).toBe(true);
    });

    it("detects fenced code blocks", () => {
      expect(isMarkdownText("```ts\nconst x = 42;\n```")).toBe(true);
    });

    it("detects blockquotes", () => {
      expect(isMarkdownText("> Simplicity is the ultimate sophistication.")).toBe(true);
    });

    it("detects markdown links and images", () => {
      expect(isMarkdownText("[Read more](https://noted.app/docs)")).toBe(true);
      expect(isMarkdownText("![Logo](https://noted.app/logo.png)")).toBe(true);
    });

    it("detects multi-line bullet and numbered lists", () => {
      expect(isMarkdownText("- Item 1\n- Item 2\n- Item 3")).toBe(true);
      expect(isMarkdownText("1. First step\n2. Second step")).toBe(true);
    });

    it("returns false for regular plain text without markdown markup", () => {
      expect(isMarkdownText("Hello world! Just writing a normal sentence.")).toBe(false);
      expect(isMarkdownText("Contact me at user@example.com for more info.")).toBe(false);
      expect(isMarkdownText("")).toBe(false);
    });
  });

  describe("markdownToTipTapHtml", () => {
    it("converts headings to html headings", () => {
      const html = markdownToTipTapHtml("# My Title\n\nSome paragraph");
      expect(html).toContain("<h1>My Title</h1>");
      expect(html).toContain("<p>Some paragraph</p>");
    });

    it("converts task list checkboxes to TipTap taskItem attributes", () => {
      const md = "- [ ] Unfinished task\n- [x] Completed task";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain('data-type="taskList"');
      expect(html).toContain('data-type="taskItem" data-checked="false"');
      expect(html).toContain('data-type="taskItem" data-checked="true"');
      expect(html).toContain("Unfinished task");
      expect(html).toContain("Completed task");
    });

    it("converts bold, italic, and links correctly", () => {
      const md = "This is **bold** and [a link](https://noted.app)";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain('<a href="https://noted.app">a link</a>');
    });

    it("converts fenced code blocks to pre and code tags", () => {
      const md = "```typescript\nconst a: number = 10;\n```";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain("<pre><code");
      expect(html).toContain("const a: number = 10;");
    });

    it("converts blockquotes to blockquote tags", () => {
      const md = "> Stay hungry, stay foolish.";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain("<blockquote>");
      expect(html).toContain("Stay hungry, stay foolish.");
    });
  });
});
