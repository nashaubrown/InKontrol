import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { PLATFORM_LABELS } from "@/lib/social/adapters";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SocialAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [accounts, targets, bestTimes] = await Promise.all([
    social.getAccountAnalytics(ctx),
    social.getPublishedTargetAnalytics(ctx),
    social.bestTimesToPost(ctx),
  ]);

  return (
    <div className="animate-settle max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Social analytics</h1>
        <Link href={`/o/${slug}/social`} className="text-sm text-primary hover:underline">
          Accounts
        </Link>
      </div>

      <h2 className="mt-6 text-sm font-semibold">Account growth (last 30 days)</h2>
      <div className="mt-2 space-y-3">
        {accounts.map((a) => {
          const first = a.snapshots[0];
          const last = a.snapshots[a.snapshots.length - 1];
          const delta = first && last ? last.followers - first.followers : 0;
          const max = Math.max(1, ...a.snapshots.map((s) => s.followers));
          return (
            <div key={a.id} className="rounded-lg border border-border-soft bg-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {PLATFORM_LABELS.find((p) => p.value === a.platform)?.label ?? a.platform} @{a.handle}
                </span>
                <span className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                  {last ? `${last.followers.toLocaleString()} followers` : "no data yet"}
                  {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta} in period)`}
                </span>
              </div>
              {a.snapshots.length > 1 && (
                <div className="mt-2 flex h-10 items-end gap-0.5">
                  {a.snapshots.map((s) => (
                    <div
                      key={s.id}
                      title={`${s.date.toISOString().slice(0, 10)}: ${s.followers}`}
                      className="flex-1 rounded-t bg-primary-light"
                      style={{ height: `${(s.followers / max) * 100}%` }}
                    />
                  ))}
                </div>
              )}
              {a.snapshots.length <= 1 && (
                <p className="mt-1 text-xs text-secondary">
                  Snapshots build up daily (cron) — check back tomorrow.
                </p>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && (
          <p className="text-sm text-secondary">Connect an account to start collecting data.</p>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold">Best times to post</h2>
      {bestTimes.length === 0 ? (
        <p className="mt-1 text-sm text-secondary">
          Publish a few posts first — suggestions come from your own engagement history.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {bestTimes.map((b, i) => (
            <li key={i} className="rounded-md border border-border-soft bg-surface px-3 py-2">
              {DAYS[b.day]} around {String(b.hour).padStart(2, "0")}:00 UTC —{" "}
              <span className="text-secondary">
                avg engagement score {Math.round(b.avgScore)} ({b.samples}{" "}
                {b.samples === 1 ? "post" : "posts"})
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold">Recent published posts</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs text-secondary">
              <th className="px-4 py-2 font-medium">Post</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Impressions</th>
              <th className="px-3 py-2 font-medium">Likes</th>
              <th className="px-3 py-2 font-medium">Comments</th>
              <th className="px-3 py-2 font-medium">Shares</th>
            </tr>
          </thead>
          <tbody style={{ fontFeatureSettings: '"tnum"' }}>
            {targets.map((t) => (
              <tr key={t.id} className="border-b border-border-soft last:border-0">
                <td className="max-w-60 truncate px-4 py-2">{t.post.content.slice(0, 60)}</td>
                <td className="px-3 py-2 text-xs text-secondary">@{t.socialAccount.handle}</td>
                <td className="px-3 py-2">{t.analytics?.impressions.toLocaleString() ?? "—"}</td>
                <td className="px-3 py-2">{t.analytics?.likes ?? "—"}</td>
                <td className="px-3 py-2">{t.analytics?.comments ?? "—"}</td>
                <td className="px-3 py-2">{t.analytics?.shares ?? "—"}</td>
              </tr>
            ))}
            {targets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-sm text-secondary">
                  Nothing published yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
