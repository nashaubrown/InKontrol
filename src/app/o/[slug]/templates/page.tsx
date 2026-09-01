import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import { BUILT_IN_TEMPLATES, listTemplates } from "@/lib/repos/templates";
import { saveSpaceAsTemplateAction, createSpaceFromTemplateAction } from "@/lib/template-actions";

export default async function TemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [custom, spaces, workspaces] = await Promise.all([
    listTemplates(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.space.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      })
    ),
    withOrg(ctx.organizationId, (tx) =>
      tx.workspace.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      })
    ),
  ]);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-1 text-sm text-secondary">
        Build a project once, reuse it for every client.
      </p>

      <h2 className="mt-6 text-sm font-semibold">Start a new space from a template</h2>
      <form
        action={createSpaceFromTemplateAction.bind(null, slug)}
        className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border-soft bg-surface p-4 text-sm"
      >
        <select name="template" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          <optgroup label="Built-in">
            {BUILT_IN_TEMPLATES.map((t) => (
              <option key={t.key} value={`builtin:${t.key}`}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {custom.length > 0 && (
            <optgroup label="Your templates">
              {custom.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="text-xs text-secondary">into workspace</span>
        <select name="workspaceId" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input
          name="spaceName"
          required
          placeholder="New space name (e.g. client name)"
          className="rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Create space
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold">Built-in templates</h2>
      <ul className="mt-2 space-y-2">
        {BUILT_IN_TEMPLATES.map((t) => (
          <li key={t.key} className="rounded-lg border border-border-soft bg-surface px-4 py-3">
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-xs text-secondary">{t.description}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-semibold">Your templates ({custom.length})</h2>
      <ul className="mt-2 space-y-2">
        {custom.map((t) => (
          <li key={t.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3">
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-xs text-secondary">{t.description}</p>
          </li>
        ))}
      </ul>
      <form
        action={saveSpaceAsTemplateAction.bind(null, slug)}
        className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border-soft bg-surface p-4 text-sm"
      >
        <span className="text-xs text-secondary">Save space</span>
        <select name="spaceId" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-secondary">as template</span>
        <input
          name="name"
          required
          placeholder="Template name"
          className="rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Save template
        </button>
      </form>
    </div>
  );
}
