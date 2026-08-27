"use client";

import { useActionState } from "react";
import { createInviteAction } from "@/lib/actions";

export function InviteForm({ orgSlug }: { orgSlug: string }) {
  const [state, formAction, pending] = useActionState(
    createInviteAction.bind(null, orgSlug),
    undefined
  );

  return (
    <div className="mt-3">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="teammate@agency.com"
          className="flex-1 rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          name="role"
          className="rounded-md border border-border-soft bg-surface px-2 py-2 text-sm"
          defaultValue="MEMBER"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Create invite
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm">{state.error}</p>}
      {state?.inviteUrl && (
        <div className="mt-3 rounded-md border border-border-soft bg-canvas p-3 text-sm">
          <p className="font-medium">Invite link (shown once — copy it now):</p>
          <code className="mt-1 block break-all text-xs">{state.inviteUrl}</code>
        </div>
      )}
    </div>
  );
}
