import { requireOrg } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import { addKeywordAction, addRankSnapshotAction } from "@/lib/marketing-actions";

export default async function MarketingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const keywords = await withOrg(ctx.organizationId, (tx) =>
    tx.trackedKeyword.findMany({
      where: { organizationId: ctx.organizationId },
      include: { snapshots: { orderBy: { date: "desc" }, take: 2 } },
      orderBy: { createdAt: "asc" },
    })
  );

  const rows = [
    {
      label: "Meta Ads reporting",
      status: "Needs Meta Marketing API app review + META_ADS_TOKEN",
    },
    {
      label: "Google Ads reporting",
      status: "Needs a Google Ads developer token (Basic Access) + OAuth credentials",
    },
    {
      label: "Website analytics (GA4 + Search Console)",
      status: "Needs Google OAuth credentials with Analytics/Search Console scopes",
    },
    {
      label: "Automatic keyword rank data",
      status: "Needs a SERP data vendor (DataForSEO / SEMrush / Ahrefs) — same decision as competitor data",
    },
  ];

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Marketing analytics</h1>

      <section className="mt-4 rounded-lg border border-border-soft bg-surface p-4 text-sm">
        <h2 className="font-semibold">Integrations</h2>
        <p className="mt-1 text-xs text-secondary">
          These pull paid-media and website data into the same dashboards. Each activates once its
          platform approval or vendor contract is in place — the data models are ready.
        </p>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-start justify-between gap-3">
              <span>{r.label}</span>
              <span className="rounded bg-accent-warm/50 px-1.5 py-0.5 text-xs">{r.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Keyword rank tracking</h2>
        <p className="mt-1 text-xs text-secondary">
          Track rankings manually until a SERP vendor is connected — history and trends carry over.
        </p>
        <form action={addKeywordAction.bind(null, slug)} className="mt-2 flex flex-wrap gap-2 text-sm">
          <input
            name="keyword"
            required
            placeholder="keyword"
            className="rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
          />
          <input
            name="targetUrl"
            required
            placeholder="https://client-site.com/page"
            className="flex-1 rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
          />
          <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
            Track
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {keywords.map((k) => {
            const [latest, prev] = k.snapshots;
            const delta = latest && prev ? prev.position - latest.position : null;
            return (
              <li key={k.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{k.keyword}</span>
                  <span className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                    {latest ? `#${latest.position}` : "no data"}
                    {delta !== null && delta !== 0 && (
                      <span className={delta > 0 ? " text-ink" : ""}>
                        {" "}
                        ({delta > 0 ? "▲" : "▼"}
                        {Math.abs(delta)})
                      </span>
                    )}
                  </span>
                </div>
                <p className="truncate text-xs text-secondary">{k.targetUrl}</p>
                <form
                  action={addRankSnapshotAction.bind(null, slug, k.id)}
                  className="mt-1 flex items-center gap-2 text-xs"
                >
                  <input
                    name="position"
                    type="number"
                    min={1}
                    required
                    placeholder="position"
                    className="w-24 rounded border border-border-soft px-1.5 py-1 outline-none focus:border-primary"
                  />
                  <button className="text-primary hover:underline">Record</button>
                </form>
              </li>
            );
          })}
          {keywords.length === 0 && <p className="text-sm text-secondary">No keywords tracked yet.</p>}
        </ul>
      </section>
    </div>
  );
}
