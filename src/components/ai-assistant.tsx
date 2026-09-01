"use client";

import { useActionState } from "react";
import { suggestCaptionsAction, rewriteAction, type AiState } from "@/lib/ai-actions";

export function AiAssistant({ orgSlug }: { orgSlug: string }) {
  const [suggestState, suggestFormAction, suggesting] = useActionState<AiState, FormData>(
    suggestCaptionsAction.bind(null, orgSlug),
    undefined
  );
  const [rewriteState, rewriteFormAction, rewriting] = useActionState<AiState, FormData>(
    rewriteAction.bind(null, orgSlug),
    undefined
  );

  return (
    <div className="mt-4 space-y-6">
      <section className="rounded-lg border border-border-soft bg-surface p-4">
        <h2 className="text-sm font-semibold">Caption ideas</h2>
        <form action={suggestFormAction} className="mt-2 space-y-2 text-sm">
          <textarea
            name="topic"
            required
            rows={2}
            placeholder="What's the post about? (e.g. announcing our client's summer sale, 20% off all services)"
            className="w-full rounded-md border border-border-soft bg-surface p-3 outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <select name="platform" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
              {["Instagram", "Facebook", "LinkedIn", "X", "TikTok"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button
              disabled={suggesting}
              className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {suggesting ? "Thinking…" : "Suggest captions"}
            </button>
          </div>
        </form>
        {suggestState?.error && <p className="mt-2 text-sm">{suggestState.error}</p>}
        {suggestState?.captions && (
          <div className="mt-3 space-y-2 text-sm">
            {suggestState.captions.map((c, i) => (
              <p key={i} className="whitespace-pre-wrap rounded-md bg-canvas p-3">
                {c}
              </p>
            ))}
            {suggestState.hashtags && suggestState.hashtags.length > 0 && (
              <p className="text-xs text-secondary">{suggestState.hashtags.join(" ")}</p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border-soft bg-surface p-4">
        <h2 className="text-sm font-semibold">Rewrite in brand voice</h2>
        <form action={rewriteFormAction} className="mt-2 space-y-2 text-sm">
          <textarea
            name="text"
            required
            rows={3}
            placeholder="Paste a draft caption…"
            className="w-full rounded-md border border-border-soft bg-surface p-3 outline-none focus:border-primary"
          />
          <button
            disabled={rewriting}
            className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {rewriting ? "Rewriting…" : "Rewrite"}
          </button>
        </form>
        {rewriteState?.error && <p className="mt-2 text-sm">{rewriteState.error}</p>}
        {rewriteState?.rewritten && (
          <p className="mt-3 whitespace-pre-wrap rounded-md bg-canvas p-3 text-sm">
            {rewriteState.rewritten}
          </p>
        )}
      </section>
    </div>
  );
}
