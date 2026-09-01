import { completeOnboardingAction } from "@/lib/portal-actions";

export function GuestWelcome({
  orgSlug,
  orgName,
  spaceNames,
}: {
  orgSlug: string;
  orgName: string;
  spaceNames: string[];
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-settle w-full max-w-md rounded-lg border border-border-soft bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to {orgName}</h1>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
              1
            </span>
            <span>
              This is your client portal. You&apos;ll see the projects {orgName} shares with you
              {spaceNames.length > 0 && (
                <>
                  : <strong>{spaceNames.join(", ")}</strong>
                </>
              )}
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
              2
            </span>
            <span>
              Open any list to see task status, add comments, and follow progress. You&apos;ll be
              notified when something needs your input.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
              3
            </span>
            <span>
              Set how you want to be notified anytime under <strong>Inbox → Notification settings</strong>.
            </span>
          </li>
        </ol>
        <form action={completeOnboardingAction.bind(null, orgSlug)} className="mt-6">
          <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Take me to my portal
          </button>
        </form>
      </div>
    </main>
  );
}
