import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import * as p3 from "@/lib/repos/phase3";
import { createGoalAction, addKeyResultAction, updateKeyResultAction } from "@/lib/phase3-actions";

export default async function GoalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [goals, spaces, lists] = await Promise.all([
    p3.listGoals(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.space.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true },
      })
    ),
    withOrg(ctx.organizationId, (tx) =>
      tx.list.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true, space: { select: { name: true } } },
      })
    ),
  ]);

  const progressByKr = new Map<string, number>();
  for (const g of goals)
    for (const kr of g.keyResults) progressByKr.set(kr.id, await p3.keyResultProgress(ctx, kr));

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>

      <form action={createGoalAction.bind(null, slug)} className="mt-4 flex flex-wrap gap-2 text-sm">
        <input
          name="title"
          required
          placeholder="New goal (e.g. Retain every client this quarter)"
          className="flex-1 rounded-md border border-border-soft bg-surface px-3 py-1.5 outline-none focus:border-primary"
        />
        <select name="spaceId" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          <option value="">Org-wide</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input type="date" name="targetDate" className="rounded-md border border-border-soft bg-surface px-2 py-1.5" />
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Add goal
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {goals.map((g) => (
          <div key={g.id} className="rounded-lg border border-border-soft bg-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium">{g.title}</p>
              <span className="text-xs text-secondary">
                {g.space ? g.space.name : "org-wide"}
                {g.targetDate && ` · by ${g.targetDate.toISOString().slice(0, 10)}`}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {g.keyResults.map((kr) => {
                const pct = Math.min(100, progressByKr.get(kr.id) ?? 0);
                return (
                  <div key={kr.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{kr.title}</span>
                      <span className="text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-border-soft">
                      <div
                        className={`h-1.5 rounded-full ${pct >= 100 ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {kr.type === "manual" && (
                      <form
                        action={updateKeyResultAction.bind(null, slug, kr.id)}
                        className="mt-1 flex items-center gap-1 text-xs"
                      >
                        <input
                          name="currentValue"
                          type="number"
                          step="any"
                          defaultValue={kr.currentValue}
                          className="w-24 rounded border border-border-soft px-1.5 py-0.5 outline-none focus:border-primary"
                        />
                        <span className="text-secondary">/ {kr.targetValue}</span>
                        <button className="text-primary hover:underline">update</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
            <form
              action={addKeyResultAction.bind(null, slug, g.id)}
              className="mt-3 flex flex-wrap gap-2 border-t border-border-soft pt-3 text-xs"
            >
              <input
                name="title"
                required
                placeholder="Key result"
                className="rounded-md border border-border-soft px-2 py-1 outline-none focus:border-primary"
              />
              <select name="type" className="rounded-md border border-border-soft bg-surface px-1.5 py-1">
                <option value="manual">manual number</option>
                <option value="task_linked">% of list done</option>
              </select>
              <input
                name="targetValue"
                type="number"
                placeholder="target (manual)"
                className="w-28 rounded-md border border-border-soft px-2 py-1 outline-none focus:border-primary"
              />
              <select name="linkedListId" className="rounded-md border border-border-soft bg-surface px-1.5 py-1">
                <option value="">list (if % of list)</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.space.name} / {l.name}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-primary px-2.5 py-1 font-medium text-white hover:opacity-90">
                Add
              </button>
            </form>
          </div>
        ))}
        {goals.length === 0 && <p className="text-sm text-secondary">No goals yet.</p>}
      </div>
    </div>
  );
}
