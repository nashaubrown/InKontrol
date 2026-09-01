import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { PLATFORM_LABELS } from "@/lib/social/adapters";
import { addCompetitorAction, addCompetitorSnapshotAction } from "@/lib/social-actions";

export default async function CompetitorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const competitors = await social.listCompetitors(ctx);

  return (
    <div className="animate-settle max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Competitors</h1>
        <Link href={`/o/${slug}/social`} className="text-sm text-primary hover:underline">
          Accounts
        </Link>
      </div>
      <p className="mt-2 rounded-md bg-primary-light/20 px-3 py-2 text-xs text-secondary">
        Automatic competitor data needs a licensed data provider (e.g. Phyllo, Social Blade API) —
        a paid vendor decision. Until then you can track competitors manually: add a profile and
        record snapshots; trends and comparisons work the same either way.
      </p>

      <form
        action={addCompetitorAction.bind(null, slug)}
        className="mt-4 flex flex-wrap gap-2 text-sm"
      >
        <select name="platform" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
          {PLATFORM_LABELS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          name="handle"
          required
          placeholder="competitor handle"
          className="rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
        />
        <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
          Track
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {competitors.map((c) => {
          const [latest, previous] = c.snapshots;
          const delta = latest && previous ? latest.followers - previous.followers : null;
          return (
            <li key={c.id} className="rounded-lg border border-border-soft bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {PLATFORM_LABELS.find((p) => p.value === c.platform)?.label} @{c.handle}
                </p>
                <span className="text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                  {latest
                    ? `${latest.followers.toLocaleString()} followers · ${latest.engagementRate}% eng.`
                    : "no snapshots yet"}
                  {delta !== null && ` (${delta > 0 ? "+" : ""}${delta})`}
                </span>
              </div>
              <form
                action={addCompetitorSnapshotAction.bind(null, slug, c.id)}
                className="mt-2 flex flex-wrap gap-2"
              >
                <input
                  name="followers"
                  type="number"
                  required
                  placeholder="followers"
                  className="w-32 rounded-md border border-border-soft px-2 py-1 text-xs outline-none focus:border-primary"
                />
                <input
                  name="engagementRate"
                  type="number"
                  step="0.01"
                  required
                  placeholder="engagement %"
                  className="w-32 rounded-md border border-border-soft px-2 py-1 text-xs outline-none focus:border-primary"
                />
                <button className="text-xs text-primary hover:underline">Record snapshot</button>
              </form>
            </li>
          );
        })}
        {competitors.length === 0 && (
          <p className="text-sm text-secondary">No competitors tracked yet.</p>
        )}
      </ul>
    </div>
  );
}
