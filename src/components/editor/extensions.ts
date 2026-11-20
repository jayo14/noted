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
import { Extension, wrappingInputRule } from "@tiptap/core";

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
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
  ];
}
