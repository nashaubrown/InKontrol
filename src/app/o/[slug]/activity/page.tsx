import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getOrgActivity } from "@/lib/repos/collab";

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const entries = await getOrgActivity(ctx);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No activity yet.</p>
      ) : (
        <ul className="mt-6 space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-border-soft bg-surface px-4 py-2">
              <span className="font-medium">{e.actor.name ?? e.actor.email}</span>{" "}
              <span className="text-secondary">{e.type.replaceAll("_", " ")}</span>
              {e.task && (
                <>
                  {" "}
                  <Link href={`/o/${slug}/t/${e.task.id}`} className="text-primary hover:underline">
                    {e.task.title}
                  </Link>
                </>
              )}
              {e.detail && <span className="text-secondary"> — {e.detail}</span>}
              <span className="ml-2 text-xs text-secondary">
                {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
