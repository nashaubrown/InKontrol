import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import { markAllReadAction } from "@/lib/notify-actions";

export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const notifications = await withOrg(ctx.organizationId, (tx) =>
    tx.notification.findMany({
      where: { organizationId: ctx.organizationId, userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="animate-settle max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Inbox {unread > 0 && <span className="text-sm text-secondary">({unread} unread)</span>}
        </h1>
        <div className="flex items-center gap-3">
          <Link href={`/o/${slug}/settings/notifications`} className="text-sm text-primary hover:underline">
            Notification settings
          </Link>
          {unread > 0 && (
            <form action={markAllReadAction.bind(null, slug)}>
              <button className="rounded-md border border-border-soft bg-surface px-3 py-1.5 text-xs hover:border-primary">
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>
      {notifications.length === 0 ? (
        <p className="mt-6 text-sm text-secondary">
          Nothing yet. You&apos;ll see task assignments, mentions, and automation alerts here.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.linkPath || `/o/${slug}`}
                className={`block rounded-lg border px-4 py-3 hover:border-primary ${
                  n.readAt ? "border-border-soft bg-surface" : "border-primary-light bg-primary-light/15"
                }`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-secondary">{n.body}</p>}
                <p className="mt-1 text-xs text-secondary">
                  {n.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
