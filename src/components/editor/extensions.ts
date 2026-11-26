import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Extension, InputRule, wrappingInputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export const ChecklistInputRule = Extension.create({
  name: "checklistInputRule",
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*(\[ \]|\[\])\s$/,
        type: this.editor.schema.nodes.taskList,
      }),
    ];
  },
});

export const MarkdownLinkInputRule = Extension.create({
  name: "markdownLinkInputRule",
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]\r\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)$/,
        handler: ({ state, range, match }) => {
          const [, label, href] = match;
          const linkMark = state.schema.marks.link;
          if (!linkMark || !label || !href) return;
          const tr = state.tr;
          tr.insertText(label, range.from, range.to);
          tr.addMark(range.from, range.from + label.length, linkMark.create({ href }));
        },
      }),
    ];
  },
});

function parseMarkdownTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

export const MarkdownTableAutoRender = Extension.create({
  name: "markdownTableAutoRender",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        if (!selection.empty) return false;

        const { $from } = selection;
        if ($from.parent.type.name !== "paragraph") return false;
        if ($from.depth < 1) return false;

        const sepText = $from.parent.textContent;
        const isSeparatorRow =
          /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(sepText) ||
          /^\s*\|\s*:?-{2,}:?\s*\|\s*$/.test(sepText);
        if (!isSeparatorRow) return false;

        const indexInParent = $from.index($from.depth - 1);
        if (indexInParent < 1) return false;

        const parentNode = $from.node($from.depth - 1);
        const prevNode = parentNode.child(indexInParent - 1);
        if (prevNode.type.name !== "paragraph") return false;

        const headerText = prevNode.textContent;
        if (!headerText.includes("|")) return false;

        const headers = parseMarkdownTableRow(headerText);
        const separators = parseMarkdownTableRow(sepText);
        if (headers.length === 0 || headers.length !== separators.length) return false;

        const { table, tableRow, tableHeader, tableCell, paragraph } = state.schema.nodes;
        if (!table || !tableRow || !tableHeader || !tableCell || !paragraph) return false;

        const headerCells = headers.map((text) =>
          tableHeader.create(null, paragraph.create(null, text ? state.schema.text(text) : undefined)),
        );
        const emptyCells = headers.map(() => tableCell.create(null, paragraph.create()));

        const tableNode = table.create(null, [
          tableRow.create(null, headerCells),
          tableRow.create(null, emptyCells),
        ]);

        const currentBlockStart = $from.before($from.depth);
        const prevBlockStart = currentBlockStart - prevNode.nodeSize;
        const currentBlockEnd = $from.after($from.depth);

        const tr = state.tr.replaceWith(prevBlockStart, currentBlockEnd, tableNode);
        // Move cursor into the first body cell
        const firstBodyCellPos =
          prevBlockStart +
          1 + // into table
          (tableNode.firstChild?.nodeSize ?? 0) + // past header row
          2; // into first tableRow -> tableCell -> paragraph
        const resolved = tr.doc.resolve(Math.min(firstBodyCellPos, tr.doc.content.size));
        tr.setSelection(TextSelection.near(resolved));
        view.dispatch(tr);
        return true;
      },
    };
  },
});

export function getEditorExtensions(placeholder = "Write freely... (type '/' for commands)") {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: {
        HTMLAttributes: {
          class: "noted-code-block",
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: "noted-blockquote",
        },
      },
      horizontalRule: {
        HTMLAttributes: {
          class: "noted-divider",
        },
      },
    }),
    Underline,
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: "noted-editor-image rounded-xl border border-[var(--border-subtle)] my-3 max-w-full shadow-xs transition-transform hover:scale-[1.005]",
      },
    }),
    Highlight.configure({
      multicolor: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["https", "http", "mailto"],
      isAllowedUri: (url, ctx) => {
        return (
          ctx.defaultValidate(url) &&
          !url.trim().toLowerCase().startsWith("javascript:") &&
          !url.trim().toLowerCase().startsWith("vbscript:")
        );
      },
      HTMLAttributes: {
        class: "noted-link",
        rel: "noopener noreferrer nofollow",
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: "noted-task-list",
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "noted-task-item",
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "noted-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    ChecklistInputRule,
    MarkdownLinkInputRule,
    MarkdownTableAutoRender,
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
  ];
}
