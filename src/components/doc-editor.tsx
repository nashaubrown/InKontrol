"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useTransition } from "react";
import { saveDocAction } from "@/lib/collab-actions";

export function DocEditor({
  orgSlug,
  docId,
  initialTitle,
  initialContent,
}: {
  orgSlug: string;
  docId: string;
  initialTitle: string;
  initialContent: unknown;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [StarterKit],
    content:
      initialContent && typeof initialContent === "object" && "type" in (initialContent as object)
        ? (initialContent as object)
        : "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-doc min-h-[50vh] rounded-lg border border-border-soft bg-surface p-6 text-sm outline-none focus:border-primary",
      },
    },
  });

  function save() {
    if (!editor) return;
    setSaved("saving");
    startTransition(async () => {
      await saveDocAction(orgSlug, docId, { title, content: editor.getJSON() });
      setSaved("saved");
      setTimeout(() => setSaved("idle"), 2000);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-transparent bg-transparent text-2xl font-semibold tracking-tight outline-none focus:border-border-soft focus:bg-surface"
        />
        <button
          onClick={save}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : "Save"}
        </button>
      </div>
      {editor && (
        <div className="mt-3 flex gap-1 text-xs">
          {(
            [
              ["B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
              ["I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
              ["H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 })],
              ["H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 })],
              ["• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
              ["1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
              ["Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote")],
              ["Code", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock")],
            ] as [string, () => void, boolean][]
          ).map(([label, fn, active]) => (
            <button
              key={label}
              onClick={fn}
              className={`rounded border px-2 py-1 font-medium ${
                active
                  ? "border-primary bg-primary-light/40"
                  : "border-border-soft bg-surface text-secondary hover:border-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
