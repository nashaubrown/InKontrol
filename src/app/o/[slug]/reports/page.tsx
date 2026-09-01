import { requireOrg } from "@/lib/tenant";
import { prisma, withOrg } from "@/lib/db";
import * as social from "@/lib/repos/social";
import { PLATFORM_LABELS } from "@/lib/social/adapters";

// Client-deliverable report (Phase 2.6). Guests can open this page in their
// portal; use the browser's print-to-PDF for a branded export.

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrg(slug);

  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? new Date(sp.to!) : new Date();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "")
    ? new Date(sp.from!)
    : new Date(to.getTime() - 30 * 24 * 3600 * 1000);

  const [org, accounts, targets, taskStats] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, brandColor: true, brandLogoUrl: true },
    }),
    social.getAccountAnalytics(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.postTarget.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: "PUBLISHED",
          publishedAt: { gte: from, lte: to },
        },
        include: { post: true, socialAccount: true, analytics: true },
        orderBy: { publishedAt: "desc" },
      })
    ),
    withOrg(ctx.organizationId, async (tx) => {
      const spaceFilter = ctx.guestSpaceIds === null ? undefined : { in: ctx.guestSpaceIds };
      const [done, total] = await Promise.all([
        tx.task.count({
          where: {
            organizationId: ctx.organizationId,
            status: "DONE",
            updatedAt: { gte: from, lte: to },
            list: { spaceId: spaceFilter },
          },
        }),
        tx.task.count({
          where: { organizationId: ctx.organizationId, list: { spaceId: spaceFilter } },
        }),
      ]);
      return { done, total };
    }),
  ]);

  const totals = targets.reduce(
    (acc, t) => ({
      impressions: acc.impressions + (t.analytics?.impressions ?? 0),
      likes: acc.likes + (t.analytics?.likes ?? 0),
      comments: acc.comments + (t.analytics?.comments ?? 0),
      shares: acc.shares + (t.analytics?.shares ?? 0),
      clicks: acc.clicks + (t.analytics?.clicks ?? 0),
    }),
    { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
  );

  const fmtD = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="animate-settle mx-auto max-w-2xl">
      <div className="flex items-start justify-between print:hidden">
        <form className="flex items-center gap-2 text-sm">
          <input type="date" name="from" defaultValue={fmtD(from)} className="rounded-md border border-border-soft bg-surface px-2 py-1" />
          <span className="text-xs text-secondary">to</span>
          <input type="date" name="to" defaultValue={fmtD(to)} className="rounded-md border border-border-soft bg-surface px-2 py-1" />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            Update
          </button>
        </form>
        <p className="text-xs text-secondary">Use your browser&apos;s Print → Save as PDF to export.</p>
      </div>

      <header className="mt-6 border-b-2 pb-4" style={{ borderColor: org?.brandColor ?? "#369AAC" }}>
        {org?.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.brandLogoUrl} alt={org.name} className="h-8 object-contain" />
        ) : (
          <p className="text-lg font-semibold" style={{ color: org?.brandColor ?? "#369AAC" }}>
            {org?.name}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Performance report</h1>
        <p className="text-sm text-secondary">
          {fmtD(from)} — {fmtD(to)}
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5" style={{ fontFeatureSettings: '"tnum"' }}>
        {[
          ["Impressions", totals.impressions],
          ["Likes", totals.likes],
          ["Comments", totals.comments],
          ["Shares", totals.shares],
          ["Clicks", totals.clicks],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border-soft bg-surface p-3 text-center">
            <p className="text-lg font-semibold">{Number(value).toLocaleString()}</p>
            <p className="text-xs text-secondary">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Work delivered</h2>
        <p className="mt-1 text-sm text-secondary">
          {taskStats.done} tasks completed in this period ({taskStats.total} total in your projects).
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Accounts</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {accounts.map((a) => {
            const latest = a.snapshots[a.snapshots.length - 1];
            return (
              <li key={a.id} className="flex justify-between rounded-md border border-border-soft bg-surface px-3 py-2">
                <span>
                  {PLATFORM_LABELS.find((p) => p.value === a.platform)?.label ?? a.platform} @{a.handle}
                </span>
                <span className="text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                  {latest ? `${latest.followers.toLocaleString()} followers · ${latest.engagementRate}% eng.` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Published posts ({targets.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {targets.map((t) => (
            <li key={t.id} className="rounded-md border border-border-soft bg-surface px-3 py-2">
              <p className="truncate">{t.post.content.slice(0, 100)}</p>
              <p className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                @{t.socialAccount.handle} · {t.publishedAt?.toISOString().slice(0, 10)} ·{" "}
                {t.analytics
                  ? `${t.analytics.impressions.toLocaleString()} impressions, ${t.analytics.likes} likes`
                  : "metrics pending"}
              </p>
            </li>
          ))}
          {targets.length === 0 && (
            <p className="text-sm text-secondary">No posts published in this period.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
