import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { listDocs } from "@/lib/repos/collab";
import { createDocAction } from "@/lib/collab-actions";

export default async function DocsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const docs = await listDocs(ctx);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
      <form action={createDocAction.bind(null, slug)} className="mt-4 flex max-w-md gap-2">
        <input
          name="title"
          required
          placeholder="New doc title…"
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Create
        </button>
      </form>
      {docs.length === 0 ? (
        <p className="mt-6 text-sm text-secondary">
          No docs yet. Docs are rich-text pages you can link to spaces, lists, or tasks.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/o/${slug}/d/${d.id}`}
                className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3 hover:border-primary"
              >
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-secondary">
                    {d.task
                      ? `on task: ${d.task.title}`
                      : d.list
                        ? `in list: ${d.list.name}`
                        : d.space
                          ? `in space: ${d.space.name}`
                          : "unlinked"}
                  </p>
                </div>
                <span className="text-xs text-secondary">
                  {d.updatedAt.toISOString().slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
