import Link from "next/link";
import { STATUSES } from "@/lib/task-ui";
import * as tasks from "@/lib/repos/tasks";
import type { OrgContext } from "@/lib/tenant";

export async function CalendarView({
  orgSlug,
  listId,
  ctx,
  month,
}: {
  orgSlug: string;
  listId: string;
  ctx: OrgContext;
  month?: string;
}) {
  const now = new Date();
  const [y, m] = /^\d{4}-\d{2}$/.test(month ?? "")
    ? (month as string).split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const items = await tasks.getTasksForCalendar(ctx, listId, first, next);

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startWeekday = (first.getUTCDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<number, typeof items>();
  for (const t of items) {
    const day = t.dueDate!.getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }

  const monthLabel = first.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link
          href={`/o/${orgSlug}/l/${listId}?view=calendar&month=${fmt(prev)}`}
          className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm hover:border-primary"
        >
          ←
        </Link>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Link
          href={`/o/${orgSlug}/l/${listId}?view=calendar&month=${fmt(next)}`}
          className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm hover:border-primary"
        >
          →
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-lg border border-border-soft bg-surface text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="border-b border-border-soft px-2 py-1 font-medium text-secondary">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="min-h-24 border-b border-r border-border-soft p-1 last:border-r-0">
            {day && (
              <>
                <span className="text-secondary">{day}</span>
                <div className="mt-1 space-y-1">
                  {(byDay.get(day) ?? []).map((t) => {
                    const status = STATUSES.find((s) => s.value === t.status);
                    return (
                      <Link
                        key={t.id}
                        href={`/o/${orgSlug}/t/${t.id}`}
                        className="block truncate rounded bg-canvas px-1 py-0.5 hover:text-primary"
                      >
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${status?.dot}`} />
                        {t.title}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
