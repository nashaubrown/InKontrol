"use client";

import { useActionState } from "react";
import {
  createApiKeyAction,
  createWebhookAction,
  type KeyState,
} from "@/lib/integration-actions";

export function ApiKeyForm({ orgSlug }: { orgSlug: string }) {
  const [state, formAction, pending] = useActionState<KeyState, FormData>(
    createApiKeyAction.bind(null, orgSlug),
    undefined
  );
  return (
    <div className="mt-3">
      <form action={formAction} className="flex flex-wrap gap-2 text-sm">
        <input
          name="name"
          required
          placeholder="Key name (e.g. Zapier)"
          className="rounded-md border border-border-soft bg-surface px-3 py-1.5 outline-none focus:border-primary"
        />
        <select name="scope" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          <option value="read">read-only</option>
          <option value="read_write">read + write</option>
        </select>
        <button
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Create key
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm">{state.error}</p>}
      {state?.rawKey && (
        <div className="mt-2 rounded-md border border-border-soft bg-canvas p-3 text-sm">
          <p className="font-medium">API key (shown once — copy it now):</p>
          <code className="mt-1 block break-all text-xs">{state.rawKey}</code>
        </div>
      )}
    </div>
  );
}

export function WebhookForm({ orgSlug, events }: { orgSlug: string; events: string[] }) {
  const [state, formAction, pending] = useActionState<KeyState, FormData>(
    createWebhookAction.bind(null, orgSlug),
    undefined
  );
  return (
    <div className="mt-3">
      <form action={formAction} className="space-y-2 text-sm">
        <input
          name="url"
          required
          placeholder="https://hooks.example.com/inkontrol"
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-1.5 outline-none focus:border-primary"
        />
        <div className="flex flex-wrap gap-3 text-xs">
          {events.map((e) => (
            <label key={e} className="flex items-center gap-1.5">
              <input type="checkbox" name="events" value={e} className="accent-primary" />
              {e}
            </label>
          ))}
        </div>
        <button
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Add webhook
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm">{state.error}</p>}
      {state?.webhookSecret && (
        <div className="mt-2 rounded-md border border-border-soft bg-canvas p-3 text-sm">
          <p className="font-medium">Signing secret (shown once — copy it now):</p>
          <code className="mt-1 block break-all text-xs">{state.webhookSecret}</code>
        </div>
      )}
    </div>
  );
}
