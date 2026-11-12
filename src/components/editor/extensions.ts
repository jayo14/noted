import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";

export function getEditorExtensions(placeholder = "Write freely...") {
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
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
  ];
}
