import { marked } from "marked";

/**
 * Checks whether a plain text string appears to contain Markdown formatting.
 */
export function isMarkdownText(rawText: string): boolean {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.trim();
  if (text.length === 0) return false;

  // Code blocks (triple backticks or tildes)
  if (/```[\s\S]*?```/.test(text) || /~~~[\s\S]*?~~~/.test(text)) return true;

  // ATX Headings: # Heading
  if (/^#{1,6}\s+\S+/m.test(text)) return true;

  // Setext Headings: Line 1 \n === or ---
  if (/^.+\r?\n[=-]{2,}\s*$/m.test(text)) return true;

  // Task list items: - [ ] or - [x] or * [ ]
  if (/^\s*[-*+]\s+\[[ xX]\]\s+\S+/m.test(text)) return true;

  // Markdown links: [text](https://...) or images ![alt](...)
  if (/!?\[[^\]\r\n]+\]\((?:https?:\/\/[^\s)]+|data:[^)]+|[^\s)]+)\)/.test(text)) return true;

  // Bold (**text** or __text__)
  if (/(\*\*|__)(?!\s).+?(?!\s)\1/.test(text)) return true;

  // Strikethrough (~~text~~)
  if (/~~(?!\s).+?(?!\s)~~/.test(text)) return true;

  // Highlights (==text==)
  if (/==(?!\s).+?(?!\s)==/.test(text)) return true;

  // Blockquotes: > quote
  if (/^>\s+\S+/m.test(text)) return true;

  // Tables: | Header | Header |
  if (/^\|[^\r\n]+\|\r?\n\|[-: |]+\|\r?\n\|[^\r\n]+\|/m.test(text)) return true;

  // Horizontal rules: --- or *** or ___
  if (/^(\*{3,}|-{3,}|_{3,})$/m.test(text)) return true;

  // Bullet list items (- or * or + followed by space)
  const bulletMatches = text.match(/^\s*[-*+]\s+\S+/gm);
  if (bulletMatches && bulletMatches.length >= 1) return true;

  // Numbered list items (1. or 1) followed by space)
  const numberedMatches = text.match(/^\s*\d+[.)]\s+\S+/gm);
  if (numberedMatches && numberedMatches.length >= 1) return true;

  // Inline code with at least some other words: `code`
  if (/`[^`\r\n]+`/.test(text) && /\w+/.test(text)) return true;

  // Italic formatting (*text* or _text_) - requiring boundary word checks
  if (/(^|\s)(\*|_)[^\s*_].*?[^\s*_]\2(\s|$|[.,!?;:])/.test(text)) return true;

  return false;
}

/**
 * Determines whether clipboard content (considering both plainText and html)
 * should be rendered automatically as Markdown into TipTap rich text.
 */
export function shouldRenderAsMarkdown(plainText: string, html?: string | null): boolean {
  if (!plainText || typeof plainText !== "string") return false;
  const trimmed = plainText.trim();
  if (trimmed.length === 0) return false;

  // If plain text doesn't look like Markdown, do not intercept
  if (!isMarkdownText(trimmed)) return false;

  // If there is no HTML clipboard data, definitely treat as Markdown
  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return true;
  }

  const trimmedHtml = html.trim();

  // If html was copied from a code element or pre tag (e.g. from GitHub, ChatGPT codeblock, IDE)
  if (trimmedHtml.includes("<pre") || trimmedHtml.includes("<code")) {
    return true;
  }

  // Many browsers and apps wrap copied text in simple <p> or <div> or <span> tags
  // but leave the raw markdown tokens inside (e.g., <p># Heading</p><p>**bold**</p>).
  // If the HTML has raw Markdown tokens like "# ", "**", "- [ ]", "```"
  const hasRawMarkdownTokensInHtml =
    /(?:^|>)\s*#{1,6}\s+\S+/.test(trimmedHtml) ||
    /\*\*[^*]+\*\*/.test(trimmedHtml) ||
    /\[[ xX]\]/.test(trimmedHtml) ||
    /```/.test(trimmedHtml) ||
    /(?:^|>)\s*>\s+\S+/.test(trimmedHtml);

  if (hasRawMarkdownTokensInHtml) {
    return true;
  }

  // If HTML doesn't contain rich structural tags (headings, tables, lists), but plainText has markdown
  const hasRichSemanticHtml = /<(h[1-6]|table|thead|tbody|ul|ol|blockquote)/i.test(trimmedHtml);
  if (!hasRichSemanticHtml) {
    return true;
  }

  return false;
}

/**
 * Transforms standard markdown task list checkboxes into TipTap taskList/taskItem format.
 */
function normalizeTaskListsForTipTap(html: string): string {
  let output = html;

  // Replace <li> containing checked input
  output = output.replace(
    /<li[^>]*>\s*(?:<p>)?\s*<input[^>]*checked[^>]*>\s*([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    '<li data-type="taskItem" data-checked="true"><div><p>$1</p></div></li>',
  );

  // Replace <li> containing unchecked input
  output = output.replace(
    /<li[^>]*>\s*(?:<p>)?\s*<input[^>]*type=["']checkbox["'][^>]*>\s*([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi,
    '<li data-type="taskItem" data-checked="false"><div><p>$1</p></div></li>',
  );

  // Wrap any <ul> that has taskItems with data-type="taskList"
  output = output.replace(
    /<ul([^>]*)>([\s\S]*?<li data-type="taskItem"[\s\S]*?)<\/ul>/gi,
    '<ul$1 data-type="taskList">$2</ul>',
  );

  return output;
}

/**
 * Normalizes headings for TipTap (TipTap starter kit uses h1, h2, h3).
 * Maps h4, h5, h6 to h3 so formatting is retained rather than lost.
 */
function normalizeHeadingsForTipTap(html: string): string {
  return html
    .replace(/<h[4-6]([^>]*)>/gi, "<h3$1>")
    .replace(/<\/h[4-6]>/gi, "</h3>");
}

/**
 * Normalizes markdown tables into clean formatted structures for TipTap native Table extension.
 * Wraps cell contents in paragraphs and attaches the noted-table styling class.
 */
function normalizeTablesForTipTap(html: string): string {
  if (!html.includes("<table")) return html;

  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
    let normalized = tableContent;

    // Wrap <th> contents in <p> if not already wrapped
    normalized = normalized.replace(
      /<th\b([^>]*)>([\s\S]*?)<\/th>/gi,
      (_m: string, attrs: string, content: string) => {
        const trimmed = content.trim();
        const inner = trimmed.startsWith("<p>") ? trimmed : `<p>${trimmed}</p>`;
        return `<th${attrs}>${inner}</th>`;
      },
    );

    // Wrap <td> contents in <p> if not already wrapped
    normalized = normalized.replace(
      /<td\b([^>]*)>([\s\S]*?)<\/td>/gi,
      (_m: string, attrs: string, content: string) => {
        const trimmed = content.trim();
        const inner = trimmed.startsWith("<p>") ? trimmed : `<p>${trimmed}</p>`;
        return `<td${attrs}>${inner}</td>`;
      },
    );

    return `<table class="noted-table">${normalized}</table>`;
  });
}

/**
 * Converts a markdown string into clean HTML formatted for TipTap editor insertion.
 */
export function markdownToTipTapHtml(markdown: string): string {
  if (!markdown) return "";

  // 1. Convert ==highlight== to <mark>highlight</mark> before marked parsing
  let preprocessed = markdown.replace(/==(?!\s)(.+?)(?!\s)==/g, "<mark>$1</mark>");

  // 2. Configure marked for clean, synchronous GFM parsing
  const rawHtml = marked.parse(preprocessed, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;

  // 3. Normalize task lists for TipTap
  let output = normalizeTaskListsForTipTap(rawHtml);

  // 4. Normalize headings for TipTap starter-kit levels (h1, h2, h3)
  output = normalizeHeadingsForTipTap(output);

  // 5. Normalize tables so they render cleanly in TipTap
  output = normalizeTablesForTipTap(output);

  return output.trim();
}
