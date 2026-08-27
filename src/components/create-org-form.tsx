"use client";

import { useActionState } from "react";
import { createOrgAction } from "@/lib/actions";

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(createOrgAction, undefined);
  return (
    <form action={formAction} className="mt-2 flex gap-2">
      <input
        name="name"
        required
        placeholder="Your agency's name"
        className="w-full rounded-md border border-border-soft px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Create
      </button>
      {state?.error && <p className="text-sm text-secondary">{state.error}</p>}
    </form>
  );
}
