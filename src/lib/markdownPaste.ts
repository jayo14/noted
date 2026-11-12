import { marked } from "marked";

/**
 * Checks whether a plain text string appears to contain Markdown formatting.
 */
export function isMarkdownText(rawText: string): boolean {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.trim();
  if (text.length === 0) return false;

  // Code blocks (triple backticks)
  if (/```[\s\S]*?```/.test(text)) return true;

  // ATX Headings: # Heading
  if (/^#{1,6}\s+\S+/m.test(text)) return true;

  // Task list items: - [ ] or - [x]
  if (/^\s*[-*+]\s+\[[ xX]\]\s+\S+/m.test(text)) return true;

  // Markdown links: [text](https://...) or images ![alt](...)
  if (/!?\[[^\]\r\n]+\]\((?:https?:\/\/[^\s)]+|data:[^)]+|[^\s)]+)\)/.test(text)) return true;

  // Bold or strikethrough formatting
  if (/(\*\*|__)(?!\s).+?(?!\s)\1/.test(text)) return true;
  if (/~~(?!\s).+?(?!\s)~~/.test(text)) return true;

  // Blockquotes: > quote
  if (/^>\s+\S+/m.test(text)) return true;

  // Tables
  if (/^\|[^\r\n]+\|\r?\n\|[-: |]+\|\r?\n\|[^\r\n]+\|/m.test(text)) return true;

  // Multiple list items (2 or more items)
  const bulletMatches = text.match(/^\s*[-*+]\s+\S+/gm);
  if (bulletMatches && bulletMatches.length >= 2) return true;

  const numberedMatches = text.match(/^\s*\d+\.\s+\S+/gm);
  if (numberedMatches && numberedMatches.length >= 2) return true;

  // Inline code with at least some other words
  if (/`[^`\r\n]{2,}`/.test(text) && /\w+/.test(text)) return true;

  return false;
}

/**
 * Transforms standard markdown task list checkboxes into TipTap taskList/taskItem format.
 */
function normalizeTaskListsForTipTap(html: string): string {
  // Convert <li> items containing checkboxes to <li data-type="taskItem" data-checked="true|false">
  let output = html;

  // Handle task list items with checked input
  output = output.replace(
    /<li[^>]*>\s*<input[^>]*checked[^>]*>\s*([\s\S]*?)<\/li>/gi,
    '<li data-type="taskItem" data-checked="true"><div><p>$1</p></div></li>',
  );

  // Handle task list items with unchecked input
  output = output.replace(
    /<li[^>]*>\s*<input[^>]*type=["']checkbox["'][^>]*>\s*([\s\S]*?)<\/li>/gi,
    '<li data-type="taskItem" data-checked="false"><div><p>$1</p></div></li>',
  );

  // If a <ul> contains task items, tag it with data-type="taskList"
  output = output.replace(
    /<ul([^>]*)>([\s\S]*?<li data-type="taskItem"[\s\S]*?)<\/ul>/gi,
    '<ul$1 data-type="taskList">$2</ul>',
  );

  return output;
}

/**
 * Converts a markdown string into clean HTML formatted for TipTap editor insertion.
 */
export function markdownToTipTapHtml(markdown: string): string {
  if (!markdown) return "";

  // Configure marked for clean, safe synchronous parsing
  const rawHtml = marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;

  return normalizeTaskListsForTipTap(rawHtml);
}
