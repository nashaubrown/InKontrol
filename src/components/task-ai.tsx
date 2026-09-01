"use client";

import { useActionState } from "react";
import {
  generateSubtasksAction,
  summarizeThreadAction,
  type AiState,
} from "@/lib/ai-actions";

export function TaskAi({ orgSlug, taskId }: { orgSlug: string; taskId: string }) {
  const [subState, subAction, subPending] = useActionState<AiState, FormData>(
    generateSubtasksAction.bind(null, orgSlug, taskId),
    undefined
  );
  const [sumState, sumAction, sumPending] = useActionState<AiState, FormData>(
    summarizeThreadAction.bind(null, orgSlug, taskId),
    undefined
  );

  return (
    <div className="mt-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <form action={subAction}>
          <button
            disabled={subPending}
            className="rounded-md border border-border-soft bg-surface px-3 py-1.5 text-xs font-medium hover:border-primary disabled:opacity-50"
          >
            {subPending ? "Generating…" : "✦ Generate subtasks"}
          </button>
        </form>
        <form action={sumAction}>
          <button
            disabled={sumPending}
            className="rounded-md border border-border-soft bg-surface px-3 py-1.5 text-xs font-medium hover:border-primary disabled:opacity-50"
          >
            {sumPending ? "Summarizing…" : "✦ Summarize thread"}
          </button>
        </form>
      </div>
      {(subState?.error || sumState?.error) && (
        <p className="mt-2 text-xs text-secondary">{subState?.error ?? sumState?.error}</p>
      )}
      {sumState?.rewritten && (
        <p className="mt-2 whitespace-pre-wrap rounded-md bg-primary-light/20 p-3 text-sm">
          {sumState.rewritten}
        </p>
      )}
    </div>
  );
}
