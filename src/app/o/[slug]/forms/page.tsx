import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import { listForms } from "@/lib/repos/phase3";
import { createFormAction, deleteFormAction } from "@/lib/phase3-actions";

export default async function FormsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [forms, lists] = await Promise.all([
    listForms(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.list.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true, space: { select: { name: true } } },
      })
    ),
  ]);
  const base = process.env.APP_URL ?? "";

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Intake forms</h1>
      <p className="mt-1 text-sm text-secondary">
        Each form is a public page that creates a task in its list on submission — share the link
        with clients so requests land straight in your workflow. The form&apos;s fields mirror the
        list&apos;s custom fields.
      </p>

      <form action={createFormAction.bind(null, slug)} className="mt-4 flex flex-wrap gap-2 text-sm">
        <input
          name="name"
          required
          placeholder="Form name (e.g. Design request)"
          className="rounded-md border border-border-soft bg-surface px-3 py-1.5 outline-none focus:border-primary"
        />
        <select name="listId" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.space.name} / {l.name}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Create form
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {forms.map((f) => (
          <li key={f.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{f.name}</p>
              <form action={deleteFormAction.bind(null, slug, f.id)}>
                <button className="text-xs text-secondary hover:text-ink">delete</button>
              </form>
            </div>
            <p className="text-xs text-secondary">
              creates tasks in {f.list.space.name} / {f.list.name}
            </p>
            <code className="mt-1 block break-all rounded bg-canvas px-2 py-1 text-xs">
              {base}/f/{f.publicId}
            </code>
          </li>
        ))}
        {forms.length === 0 && <p className="text-sm text-secondary">No forms yet.</p>}
      </ul>
    </div>
  );
}
