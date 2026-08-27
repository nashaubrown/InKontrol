"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";

export function AuthForm({
  mode,
  action,
}: {
  mode: "sign-in" | "sign-up";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignUp = mode === "sign-up";

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-settle w-full max-w-sm rounded-lg border border-border-soft bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight text-primary">InKontrol</h1>
        <p className="mt-1 text-sm text-secondary">
          {isSignUp ? "Create your account" : "Sign in to your workspace"}
        </p>
        <form action={formAction} className="mt-6 space-y-4">
          {isSignUp && (
            <Field label="Your name" name="name" type="text" autoComplete="name" />
          )}
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          {state?.error && (
            <p className="rounded-md bg-error/30 px-3 py-2 text-sm">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-secondary">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/sign-up" className="text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function Field(props: { label: string; name: string; type: string; autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <input
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        required
        className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
