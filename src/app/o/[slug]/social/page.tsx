import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { PLATFORM_LABELS } from "@/lib/social/adapters";
import { createDemoAccountAction, deleteAccountAction } from "@/lib/social-actions";

export default async function SocialAccountsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const accounts = await social.listAccounts(ctx);

  return (
    <div className="animate-settle max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Social accounts</h1>
        <nav className="flex gap-3 text-sm">
          <Link href={`/o/${slug}/social/posts`} className="text-primary hover:underline">
            Posts
          </Link>
          <Link href={`/o/${slug}/social/analytics`} className="text-primary hover:underline">
            Analytics
          </Link>
          <Link href={`/o/${slug}/social/competitors`} className="text-primary hover:underline">
            Competitors
          </Link>
        </nav>
      </div>

      <p className="mt-2 rounded-md bg-primary-light/20 px-3 py-2 text-xs text-secondary">
        Accounts run in <strong>demo mode</strong>: publishing and analytics are fully simulated so
        you can test the whole workflow today. Real platform publishing switches on per platform as
        each developer-app approval (Meta, LinkedIn, TikTok…) lands.
      </p>

      {accounts.length === 0 ? (
        <p className="mt-6 text-sm text-secondary">No accounts connected yet. Add one below.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {accounts.map((a) => {
            const latest = a.snapshots[0];
            return (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {PLATFORM_LABELS.find((p) => p.value === a.platform)?.label ?? a.platform} ·{" "}
                    @{a.handle}
                    {a.isDemo && (
                      <span className="ml-2 rounded bg-accent-warm/60 px-1.5 text-xs">demo</span>
                    )}
                  </p>
                  {latest && (
                    <p className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                      {latest.followers.toLocaleString()} followers · {latest.engagementRate}%
                      engagement · reach {latest.reach.toLocaleString()}
                    </p>
                  )}
                </div>
                <form action={deleteAccountAction.bind(null, slug, a.id)}>
                  <button className="text-xs text-secondary hover:text-ink">disconnect</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={createDemoAccountAction.bind(null, slug)}
        className="mt-6 flex flex-wrap gap-2 rounded-lg border border-border-soft bg-surface p-4 text-sm"
      >
        <select name="platform" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          {PLATFORM_LABELS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          name="handle"
          required
          placeholder="handle (e.g. youragency)"
          className="rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Connect (demo)
        </button>
      </form>
    </div>
  );
}
