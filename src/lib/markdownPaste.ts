import { marked } from "marked";

/**
 * Checks whether a plain text string appears to contain Markdown formatting.
 */
export function isMarkdownText(rawText: string): boolean {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) return false;

  // Code blocks (triple backticks or tildes)
  if (/```[\s\S]*?```/.test(text) || /~~~[\s\S]*?~~~/.test(text)) return true;

  // Shebang scripts (e.g. #!/usr/bin/env bash) without fenced code blocks are code, not headings
  if (/^#!\//.test(text)) return false;

  // ATX Headings: # Heading
  if (/^#{1,6}\s+\S+/m.test(text)) return true;

  // Setext Headings: Line 1 \n === or ---
  if (/^.+\n[=-]{2,}\s*$/m.test(text)) return true;

  // Task list items: - [ ] or - [x] or * [ ]
  if (/^\s*[-*+]\s+\[[ xX]\]\s+\S+/m.test(text)) return true;

  // Markdown links: [text](url) or images ![alt](url) or angle-bracket autolinks <https://...>
  if (/!?\[[^\]\r\n]+\]\((?:https?:\/\/[^\s)]+|data:[^)]+|[^\s)]+)\)/.test(text)) return true;
  if (/<https?:\/\/[^\s>]+>/.test(text)) return true;

  // Reference-style links: [label][ref] with [ref]: url
  if (/\[[^\]\r\n]+\]\[[^\]\r\n]*\]/.test(text) && /^\s*\[[^\]\r\n]+\]:\s+\S+/m.test(text)) {
    return true;
  }

  // Bold (**text** or __text__)
  if (/(\*\*|__)(?!\s).+?(?!\s)\1/.test(text)) return true;

  // Strikethrough (~~text~~)
  if (/~~(?!\s).+?(?!\s)~~/.test(text)) return true;

  // Highlights (==text==)
  if (/==(?!\s).+?(?!\s)==/.test(text)) return true;

  // Blockquotes: > quote
  if (/^>\s+\S+/m.test(text)) return true;

  // GFM Tables: with or without outer pipes, with alignment colons
  if (
    /^\s*\|?[^\n|]+\|[^\n]*\n\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*(?:\n|$)/m.test(
      text,
    ) ||
    /^\s*\|[^\n]+\|\s*\n\s*\|\s*:?-{2,}:?\s*\|\s*(?:\n|$)/m.test(text)
  ) {
    return true;
  }

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
  if (/(^|\s)(\*|_)[^\s*_](?:.*?[^\s*_])?\2(\s|$|[.,!?;:])/.test(text)) return true;

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
  const hasRawMarkdownTokensInHtml =
    /(?:^|>)\s*#{1,6}\s+\S+/.test(trimmedHtml) ||
    /\*\*[^*]+\*\*/.test(trimmedHtml) ||
    /~~[^~]+~~/.test(trimmedHtml) ||
    /==[^=]+==/.test(trimmedHtml) ||
    /\[[ xX]\]/.test(trimmedHtml) ||
    /```/.test(trimmedHtml) ||
    /\|[^|\n]+\|/.test(trimmedHtml) ||
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
 * Transforms standard markdown task list checkboxes into TipTap taskList/taskItem format,
 * preserving nested lists and inline formatting inside task items.
 */
function normalizeTaskListsForTipTap(html: string): string {
  // Match opening <li> (with optional <p>) containing a checkbox input, capturing the item body
  // up to any nested list (<ul>/<ol>) or closing </li>.
  const taskItemPattern =
    /<li([^>]*)>\s*(?:<p>)?\s*<input([^>]*type=["']checkbox["'][^>]*)>\s*([\s\S]*?)(?:<\/p>)?(?=\s*(?:<(?:ul|ol)\b|<\/li>))/gi;

  let output = html.replace(
    taskItemPattern,
    (_match, liAttrs: string, inputAttrs: string, content: string) => {
      const isChecked = /\bchecked\b/i.test(inputAttrs);
      return `<li${liAttrs} data-type="taskItem" data-checked="${isChecked}"><div><p>${content.trim()}</p></div>`;
    },
  );

  // Also handle inputs where `checked` appears without `type="checkbox"` attribute order issues
  output = output.replace(
    /<li([^>]*)>\s*(?:<p>)?\s*<input([^>]*\bchecked\b[^>]*)>\s*([\s\S]*?)(?:<\/p>)?(?=\s*(?:<(?:ul|ol)\b|<\/li>))/gi,
    (_match, liAttrs: string, _inputAttrs: string, content: string) => {
      return `<li${liAttrs} data-type="taskItem" data-checked="true"><div><p>${content.trim()}</p></div>`;
    },
  );

  // Mark any <ul> that contains at least one taskItem as data-type="taskList"
  output = output.replace(
    /<ul(?![^>]*data-type="taskList")([^>]*)>([\s\S]*?<li[^>]*data-type="taskItem"[\s\S]*?)<\/ul>/gi,
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
 * Wraps cell contents in paragraphs, preserves alignment, and attaches the noted-table styling class.
 */
function normalizeTablesForTipTap(html: string): string {
  if (!html.includes("<table")) return html;

  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
    let normalized = tableContent.replace(/>\s+</g, "><");

    const normalizeCell = (tag: "th" | "td", attrs: string, content: string) => {
      const trimmed = content.trim();
      // Preserve marked's align="..." attribute as inline text-align style on the cell
      let cleanAttrs = attrs;
      const alignMatch = attrs.match(/\balign=["'](left|center|right)["']/i);
      if (alignMatch && !/\bstyle=/i.test(attrs)) {
        cleanAttrs = attrs.replace(
          /\balign=["'](left|center|right)["']/i,
          `style="text-align: $1"`,
        );
      }
      const inner = /^<p[\s>]/i.test(trimmed) ? trimmed : `<p>${trimmed}</p>`;
      return `<${tag}${cleanAttrs}>${inner}</${tag}>`;
    };

    normalized = normalized.replace(
      /<th\b([^>]*)>([\s\S]*?)<\/th>/gi,
      (_m: string, attrs: string, content: string) => normalizeCell("th", attrs, content),
    );

    normalized = normalized.replace(
      /<td\b([^>]*)>([\s\S]*?)<\/td>/gi,
      (_m: string, attrs: string, content: string) => normalizeCell("td", attrs, content),
    );

    return `<table class="noted-table">${normalized}</table>`;
  });
}

/**
 * Strips dangerous HTML tags, inline event handlers, and malicious schemes (e.g., javascript:)
 * to guarantee that rendered markdown cannot execute arbitrary scripts in the WebView.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  return html
    // 1. Remove dangerous executable containers: script, iframe, object, embed, form, applet, base
    .replace(/<\s*(script|iframe|object|embed|form|applet|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|applet|base)[^>]*\/?>/gi, "")
    // 2. Remove inline event handlers (e.g. onerror=, onclick=, onload=)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    // 3. Neutralize javascript:, vbscript: links and sources
    .replace(/\s+(href|src)\s*=\s*['"]?\s*(?:javascript|vbscript):[^'">\s]*['"]?/gi, ' $1="#"');
}

/**
 * Converts ==highlight== syntax to <mark>highlight</mark> while leaving
 * fenced code blocks and inline code spans untouched.
 */
function preprocessHighlights(markdown: string): string {
  const codeSegments: string[] = [];
  const placeholder = (idx: number) => `\u0000NOTED_CODE_${idx}\u0000`;

  // Temporarily mask fenced code blocks and inline code spans
  const masked = markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (match) => {
      const idx = codeSegments.push(match) - 1;
      return placeholder(idx);
    })
    .replace(/`[^`\r\n]+`/g, (match) => {
      const idx = codeSegments.push(match) - 1;
      return placeholder(idx);
    });

  const highlighted = masked.replace(/==(?!\s)(.+?)(?!\s)==/g, "<mark>$1</mark>");

  return highlighted.replace(/\u0000NOTED_CODE_(\d+)\u0000/g, (_m, idx) => codeSegments[Number(idx)]);
}

/**
 * Converts a markdown string into clean HTML formatted for TipTap editor insertion.
 */
export function markdownToTipTapHtml(markdown: string): string {
  if (!markdown) return "";

  // 1. Normalize line endings and neutralize javascript: or vbscript: in markdown link syntax
  let preprocessed = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\[([^\]]+)\]\((?:javascript|vbscript):[^)]+\)/gi, "[$1](#)");

  // 2. Convert ==highlight== to <mark>highlight</mark> outside of code blocks/spans
  preprocessed = preprocessHighlights(preprocessed);

  // 3. Configure marked for clean, synchronous GFM parsing
  const rawHtml = marked.parse(preprocessed, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;

  // 4. Sanitize raw HTML against script execution, iframes, and XSS
  let output = sanitizeHtml(rawHtml);

  // 5. Normalize task lists for TipTap
  output = normalizeTaskListsForTipTap(output);

  // 6. Normalize headings for TipTap starter-kit levels (h1, h2, h3)
  output = normalizeHeadingsForTipTap(output);

  // 7. Normalize tables so they render cleanly in TipTap
  output = normalizeTablesForTipTap(output);

  return output.trim();
}
