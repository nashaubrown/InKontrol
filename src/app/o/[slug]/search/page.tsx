import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as tasks from "@/lib/repos/tasks";
import { STATUSES } from "@/lib/task-ui";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q = "" } = await searchParams;
  const ctx = await requireOrg(slug);
  const results = q.trim() ? await tasks.searchTasks(ctx, q.trim().slice(0, 200)) : [];

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <form className="mt-4 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tasks…"
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Search
        </button>
      </form>
      {q.trim() && (
        <p className="mt-4 text-sm text-secondary">
          {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {results.map((t) => (
          <li key={t.id}>
            <Link
              href={`/o/${slug}/t/${t.id}`}
              className="block rounded-lg border border-border-soft bg-surface px-4 py-3 hover:border-primary"
            >
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  STATUSES.find((s) => s.value === t.status)?.dot
                }`}
              />
              <span className="text-sm font-medium">{t.title}</span>
              <span className="ml-2 text-xs text-secondary">
                {t.list.space.name} / {t.list.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
