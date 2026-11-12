import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
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
      HTMLAttributes: {
        class: "noted-link",
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
    ChecklistInputRule,
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
  ];
}
