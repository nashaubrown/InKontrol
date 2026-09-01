import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as p3 from "@/lib/repos/phase3";
import { stopTimerAction } from "@/lib/phase3-actions";

export default async function TimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [running, entries] = await Promise.all([p3.getRunningTimer(ctx), p3.getTimeEntries(ctx)]);
  const totalMin = entries.reduce((n, e) => n + p3.minutesOf(e), 0);
  const billableMin = entries.filter((e) => e.billable).reduce((n, e) => n + p3.minutesOf(e), 0);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Time tracking</h1>
      {running ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-primary bg-primary-light/20 px-4 py-3 text-sm">
          <span>
            Timer running on{" "}
            <Link href={`/o/${slug}/t/${running.task.id}`} className="font-medium text-primary hover:underline">
              {running.task.title}
            </Link>{" "}
            since {running.startedAt.toISOString().slice(11, 16)} UTC
          </span>
          <form action={stopTimerAction.bind(null, slug, `/o/${slug}/time`)}>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              Stop
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-2 text-sm text-secondary">
          No timer running. Start one from any task page.
        </p>
      )}

      <p className="mt-6 text-sm text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
        Your last {entries.length} entries: {(totalMin / 60).toFixed(1)}h total,{" "}
        {(billableMin / 60).toFixed(1)}h billable.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs text-secondary">
              <th className="px-4 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Billable</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody style={{ fontFeatureSettings: '"tnum"' }}>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border-soft last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/o/${slug}/t/${e.task.id}`} className="hover:text-primary">
                    {e.task.title}
                  </Link>
                  <span className="ml-1 text-xs text-secondary">({e.task.list.space.name})</span>
                </td>
                <td className="px-3 py-2 text-xs text-secondary">
                  {e.startedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  {(p3.minutesOf(e) / 60).toFixed(1)}h{!e.endedAt && " (running)"}
                </td>
                <td className="px-3 py-2 text-xs">{e.billable ? "yes" : "no"}</td>
                <td className="px-3 py-2 text-xs text-secondary">{e.note}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-secondary">
                  No time tracked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
