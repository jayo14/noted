import { describe, it, expect } from "vitest";
import {
  isMarkdownText,
  shouldRenderAsMarkdown,
  markdownToTipTapHtml,
  sanitizeHtml,
} from "@/lib/markdownPaste";

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

    it("detects highlight syntax", () => {
      expect(isMarkdownText("Note this ==vital detail==")).toBe(true);
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

    it("detects tables", () => {
      const table = "| Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |";
      expect(isMarkdownText(table)).toBe(true);
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

  describe("shouldRenderAsMarkdown", () => {
    it("returns true for markdown text when html is absent or empty", () => {
      expect(shouldRenderAsMarkdown("# Header\n\nContent", null)).toBe(true);
      expect(shouldRenderAsMarkdown("**Bold statement**", "")).toBe(true);
    });

    it("returns true when html is from a codeblock wrapper", () => {
      const md = "### Title\n- [ ] Task";
      const html = "<pre><code>### Title\n- [ ] Task</code></pre>";
      expect(shouldRenderAsMarkdown(md, html)).toBe(true);
    });

    it("returns true when html has raw markdown tokens in simple tags", () => {
      const md = "# Heading 1\n**Bold** text";
      const html = "<p># Heading 1</p><p>**Bold** text</p>";
      expect(shouldRenderAsMarkdown(md, html)).toBe(true);
    });

    it("returns false for non-markdown plain text", () => {
      expect(shouldRenderAsMarkdown("Just regular text", null)).toBe(false);
      expect(shouldRenderAsMarkdown("A regular paragraph of thoughts.", "<p>A regular paragraph of thoughts.</p>")).toBe(false);
    });
  });

  describe("markdownToTipTapHtml", () => {
    it("converts headings to html headings", () => {
      const html = markdownToTipTapHtml("# My Title\n\nSome paragraph");
      expect(html).toContain("<h1>My Title</h1>");
      expect(html).toContain("<p>Some paragraph</p>");
    });

    it("maps h4-h6 to h3 for TipTap StarterKit compatibility", () => {
      const html = markdownToTipTapHtml("#### Level 4 Subheading");
      expect(html).toContain("<h3>Level 4 Subheading</h3>");
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

    it("converts bold, italic, highlights, and links correctly", () => {
      const md = "This is **bold**, ==highlighted==, and [a link](https://noted.app)";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<mark>highlighted</mark>");
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

    it("converts markdown tables to clean structured TipTap tables", () => {
      const md = "| Task | Status |\n| --- | --- |\n| Design | Done |\n| Build | Pending |";
      const html = markdownToTipTapHtml(md);

      expect(html).toContain('class="noted-table"');
      expect(html).toContain("<th><p>Task</p></th>");
      expect(html).toContain("<th><p>Status</p></th>");
      expect(html).toContain("<td><p>Design</p></td>");
      expect(html).toContain("<td><p>Done</p></td>");
      expect(html).toContain("<td><p>Build</p></td>");
      expect(html).toContain("<td><p>Pending</p></td>");
    });

    it("sanitizes dangerous script tags, iframes, and inline event handlers", () => {
      const maliciousMd = `# Safe Heading
<script>alert('pwned')</script>
<iframe src="https://attacker.com"></iframe>
<img src="x" onerror="evil()" />
[Click me](javascript:alert(1))
`;
      const html = markdownToTipTapHtml(maliciousMd);

      expect(html).toContain("<h1>Safe Heading</h1>");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert('pwned')");
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain("onerror");
      expect(html).not.toContain("javascript:");
    });
  });

  describe("sanitizeHtml", () => {
    it("strips executable script and iframe tags", () => {
      const input = "<p>Text</p><script>window.location='malicious'</script><iframe src='x'></iframe>";
      const sanitized = sanitizeHtml(input);
      expect(sanitized).toBe("<p>Text</p>");
    });

    it("removes inline DOM event handlers", () => {
      const input = '<div onclick="steal()" onmouseover="track()" class="card">Safe text</div>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain("onclick");
      expect(sanitized).not.toContain("onmouseover");
      expect(sanitized).toContain('class="card">Safe text</div>');
    });

    it("neutralizes javascript: URIs in link href and image src", () => {
      const input = '<a href="javascript:void(0)">Link</a><img src="javascript:evil()">';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).toContain('href="#"');
    });
  });
});
