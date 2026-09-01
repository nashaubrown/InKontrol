import { requireOrg } from "@/lib/tenant";
import { getWorkload } from "@/lib/repos/phase3";

export default async function WorkloadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const rows = await getWorkload(ctx);
  const maxOpen = Math.max(1, ...rows.map((r) => r.openTasks));

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Workload</h1>
      <p className="mt-1 text-sm text-secondary">
        Open tasks, overdue work, and hours tracked in the last 7 days — per person, across all
        clients.
      </p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.user.id} className="rounded-lg border border-border-soft bg-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{r.user.name ?? r.user.email}</span>
              <span className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                {r.openTasks} open · {r.overdue} overdue · {r.hoursThisWeek}h this week
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-border-soft">
              <div
                className={`h-2 rounded-full ${r.overdue > 0 ? "bg-accent-warm" : "bg-primary"}`}
                style={{ width: `${(r.openTasks / maxOpen) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
