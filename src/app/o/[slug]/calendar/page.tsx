import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getUnifiedCalendar } from "@/lib/repos/social";
import { STATUSES } from "@/lib/task-ui";

export default async function UnifiedCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { slug } = await params;
  const { month } = await searchParams;
  const ctx = await requireOrg(slug);

  const now = new Date();
  const [y, m] = /^\d{4}-\d{2}$/.test(month ?? "")
    ? (month as string).split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const { tasks, targets } = await getUnifiedCalendar(ctx, first, next);

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startWeekday = (first.getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthLabel = first.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="animate-settle">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Content calendar</h1>
        <Link
          href={`/o/${slug}/calendar?month=${fmt(prev)}`}
          className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm hover:border-primary"
        >
          ←
        </Link>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Link
          href={`/o/${slug}/calendar?month=${fmt(next)}`}
          className="rounded-md border border-border-soft bg-surface px-2 py-1 text-sm hover:border-primary"
        >
          →
        </Link>
      </div>
      <p className="mt-1 text-xs text-secondary">
        Tasks (by due date) and scheduled posts, in one place.
      </p>
      <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-lg border border-border-soft bg-surface text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="border-b border-border-soft px-2 py-1 font-medium text-secondary">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="min-h-28 border-b border-r border-border-soft p-1 last:border-r-0">
            {day && (
              <>
                <span className="text-secondary">{day}</span>
                <div className="mt-1 space-y-1">
                  {tasks
                    .filter((t) => t.dueDate!.getUTCDate() === day)
                    .map((t) => (
                      <Link
                        key={t.id}
                        href={`/o/${slug}/t/${t.id}`}
                        className="block truncate rounded bg-canvas px-1 py-0.5 hover:text-primary"
                      >
                        <span
                          className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                            STATUSES.find((s) => s.value === t.status)?.dot
                          }`}
                        />
                        {t.title}
                      </Link>
                    ))}
                  {targets
                    .filter((t) => t.scheduledAt!.getUTCDate() === day)
                    .map((t) => (
                      <Link
                        key={t.id}
                        href={`/o/${slug}/social/p/${t.post.id}`}
                        className="block truncate rounded bg-primary-light/30 px-1 py-0.5 hover:text-primary"
                      >
                        ▸ @{t.socialAccount.handle}: {t.post.content.slice(0, 30)}
                      </Link>
                    ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
