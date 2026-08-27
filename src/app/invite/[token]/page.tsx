import { acceptInviteAction } from "@/lib/actions";
import { requireUser } from "@/lib/tenant";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await requireUser(); // redirects to sign-in if not authenticated

  let error: string | null = null;
  try {
    await acceptInviteAction(token);
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    error = err instanceof Error ? err.message : "Invite is invalid or expired";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-settle max-w-sm rounded-lg border border-border-soft bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold text-primary">InKontrol</h1>
        <p className="mt-3 text-sm">{error}</p>
        <p className="mt-2 text-xs text-secondary">
          Ask the person who invited you for a new link — invites are single-use and expire
          after 48 hours.
        </p>
      </div>
    </main>
  );
}
