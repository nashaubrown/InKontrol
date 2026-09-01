import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import * as tasks from "@/lib/repos/tasks";
import { PROVIDERS, getTokens } from "@/lib/storage";
import { importCloudFileAction } from "@/lib/storage-actions";

export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; taskId: string }>;
  searchParams: Promise<{ provider?: string; q?: string }>;
}) {
  const { slug, taskId } = await params;
  const { provider = "google_drive", q = "" } = await searchParams;
  const ctx = await requireOrg(slug);
  const task = await tasks.getTask(ctx, taskId);
  if (!task) notFound();
  const p = PROVIDERS[provider];
  if (!p) notFound();

  const tokens = p.configured() ? await getTokens(ctx, provider) : null;
  let files: Awaited<ReturnType<typeof p.list>> = [];
  let listError: string | null = null;
  if (tokens) {
    try {
      files = await p.list(tokens, q.slice(0, 100));
    } catch (err) {
      listError = err instanceof Error ? err.message : "Could not list files";
    }
  }

  return (
    <div className="animate-settle max-w-2xl">
      <p className="text-xs text-secondary">
        <Link href={`/o/${slug}/t/${taskId}`} className="hover:text-primary">
          ← back to {task.title}
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import a file</h1>
      <div className="mt-3 flex gap-2 text-sm">
        {Object.values(PROVIDERS).map((prov) => (
          <Link
            key={prov.key}
            href={`/o/${slug}/t/${taskId}/import?provider=${prov.key}`}
            className={`rounded-md border px-3 py-1.5 ${
              provider === prov.key
                ? "border-primary bg-primary-light/30 font-medium"
                : "border-border-soft bg-surface text-secondary hover:border-primary"
            }`}
          >
            {prov.label}
          </Link>
        ))}
      </div>

      {!p.configured() ? (
        <p className="mt-6 text-sm text-secondary">
          {p.label} isn&apos;t configured yet — an admin needs to add its OAuth credentials to the
          environment (see Settings).
        </p>
      ) : !tokens ? (
        <p className="mt-6 text-sm">
          <a
            href={`/api/integrations/${provider}/connect?org=${slug}`}
            className="text-primary hover:underline"
          >
            Connect your {p.label} account →
          </a>
        </p>
      ) : (
        <>
          <form className="mt-4 flex max-w-md gap-2">
            <input type="hidden" name="provider" value={provider} />
            <input
              name="q"
              defaultValue={q}
              placeholder={`Search ${p.label}…`}
              className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Search
            </button>
          </form>
          {listError && <p className="mt-4 text-sm">{listError}</p>}
          <ul className="mt-4 space-y-1">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-2 text-sm"
              >
                <span>
                  {f.name}
                  {f.size !== null && (
                    <span className="ml-2 text-xs text-secondary">{(f.size / 1024).toFixed(0)} KB</span>
                  )}
                </span>
                <form action={importCloudFileAction.bind(null, slug, taskId, provider, f.id, f.name)}>
                  <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90">
                    Import
                  </button>
                </form>
              </li>
            ))}
            {files.length === 0 && !listError && (
              <p className="mt-2 text-sm text-secondary">No files found.</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
