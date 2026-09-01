import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import * as p3 from "@/lib/repos/phase3";
import { STATUSES } from "@/lib/task-ui";

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);

  const [byStatus, overdue, dueThisWeek, workload, goals] = await Promise.all([
    withOrg(ctx.organizationId, (tx) =>
      tx.task.groupBy({
        by: ["status"],
        where: { organizationId: ctx.organizationId },
        _count: true,
      })
    ),
    withOrg(ctx.organizationId, (tx) =>
      tx.task.count({
        where: {
          organizationId: ctx.organizationId,
          status: { not: "DONE" },
          dueDate: { lt: new Date() },
        },
      })
    ),
    withOrg(ctx.organizationId, (tx) =>
      tx.task.count({
        where: {
          organizationId: ctx.organizationId,
          status: { not: "DONE" },
          dueDate: { gte: new Date(), lt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
        },
      })
    ),
    p3.getWorkload(ctx),
    p3.listGoals(ctx),
  ]);

  const total = byStatus.reduce((n, s) => n + s._count, 0);
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;

  return (
    <div className="animate-settle max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ fontFeatureSettings: '"tnum"' }}>
        {[
          ["Open tasks", total - count("DONE")],
          ["Done", count("DONE")],
          ["Overdue", overdue],
          ["Due in 7 days", dueThisWeek],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border-soft bg-surface p-4 text-center">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-secondary">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold">Tasks by status</h2>
      <div className="mt-2 flex h-4 overflow-hidden rounded-full border border-border-soft">
        {STATUSES.map((s) => {
          const c = count(s.value);
          if (total === 0 || c === 0) return null;
          return (
            <div
              key={s.value}
              className={s.dot}
              style={{ width: `${(c / total) * 100}%` }}
              title={`${s.label}: ${c}`}
            />
          );
        })}
        {total === 0 && <div className="w-full bg-canvas" />}
      </div>
      <p className="mt-1 text-xs text-secondary">
        {STATUSES.map((s) => `${s.label}: ${count(s.value)}`).join(" · ")}
      </p>

      <h2 className="mt-8 text-sm font-semibold">
        Team workload{" "}
        <Link href={`/o/${slug}/workload`} className="text-xs font-normal text-primary hover:underline">
          full view →
        </Link>
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {workload.map((r) => (
          <li key={r.user.id} className="flex justify-between rounded-md border border-border-soft bg-surface px-3 py-2">
            <span>{r.user.name ?? r.user.email}</span>
            <span className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
              {r.openTasks} open · {r.overdue} overdue · {r.hoursThisWeek}h tracked
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-semibold">
        Goals{" "}
        <Link href={`/o/${slug}/goals`} className="text-xs font-normal text-primary hover:underline">
          manage →
        </Link>
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {goals.slice(0, 5).map((g) => (
          <li key={g.id} className="rounded-md border border-border-soft bg-surface px-3 py-2">
            {g.title}
            <span className="ml-2 text-xs text-secondary">
              {g.keyResults.length} key {g.keyResults.length === 1 ? "result" : "results"}
            </span>
          </li>
        ))}
        {goals.length === 0 && <p className="text-xs text-secondary">No goals yet.</p>}
      </ul>
    </div>
  );
}
