import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { createPostAction } from "@/lib/social-actions";
import { PLATFORM_LABELS } from "@/lib/social/adapters";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-border-soft/60",
  PENDING_APPROVAL: "bg-accent-warm/60",
  SCHEDULED: "bg-primary-light/50",
  PUBLISHED: "bg-success/50",
  FAILED: "bg-error/50",
};

export default async function PostsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [posts, accounts] = await Promise.all([social.listPosts(ctx), social.listAccounts(ctx)]);

  return (
    <div className="animate-settle max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <Link href={`/o/${slug}/social`} className="text-sm text-primary hover:underline">
          Accounts
        </Link>
      </div>

      <form
        action={createPostAction.bind(null, slug)}
        className="mt-4 rounded-lg border border-border-soft bg-surface p-4 text-sm"
      >
        <textarea
          name="content"
          required
          rows={3}
          placeholder="Write once, publish everywhere…"
          className="w-full rounded-md border border-border-soft bg-surface p-3 outline-none focus:border-primary"
        />
        <input
          name="mediaUrl"
          placeholder="Media URL (optional)"
          className="mt-2 w-full rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {accounts.length === 0 ? (
            <p className="text-xs text-secondary">
              <Link href={`/o/${slug}/social`} className="text-primary hover:underline">
                Connect an account
              </Link>{" "}
              first.
            </p>
          ) : (
            accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="accountIds" value={a.id} className="accent-primary" />
                {PLATFORM_LABELS.find((p) => p.value === a.platform)?.label ?? a.platform} @{a.handle}
              </label>
            ))
          )}
          <label className="flex items-center gap-1.5 text-xs text-secondary">
            Schedule
            <input
              type="datetime-local"
              name="scheduledAt"
              className="rounded-md border border-border-soft bg-surface px-2 py-1"
            />
          </label>
          <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
            Create draft
          </button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/o/${slug}/social/p/${p.id}`}
              className="block rounded-lg border border-border-soft bg-surface px-4 py-3 hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">{p.content.slice(0, 90)}</p>
                <span className={`ml-3 shrink-0 rounded px-2 py-0.5 text-xs ${STATUS_BADGE[p.status]}`}>
                  {p.status.toLowerCase().replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs text-secondary">
                {p.targets.map((t) => `@${t.socialAccount.handle}`).join(", ")}
                {p.targets[0]?.scheduledAt &&
                  ` · scheduled ${p.targets[0].scheduledAt.toISOString().slice(0, 16).replace("T", " ")} UTC`}
                {p.linkedTask && ` · task: ${p.linkedTask.title}`}
              </p>
            </Link>
          </li>
        ))}
        {posts.length === 0 && <p className="text-sm text-secondary">No posts yet.</p>}
      </ul>
    </div>
  );
}
