import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getPlan, getUsage, PLAN_LIMITS, stripeConfigured } from "@/lib/billing";
import { upgradeAction, billingPortalAction } from "@/lib/billing-actions";

export default async function UsagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const isAdmin = hasAtLeastRole(ctx, "ADMIN");
  const [plan, usage, sub] = await Promise.all([
    getPlan(ctx.organizationId),
    getUsage(ctx.organizationId),
    prisma.subscription.findUnique({ where: { organizationId: ctx.organizationId } }),
  ]);
  const limits = PLAN_LIMITS[plan];

  const rows = [
    { label: "Team members (non-guest)", used: usage.members, limit: limits.members },
    { label: "Spaces", used: usage.spaces, limit: limits.spaces },
    { label: "Attachment storage (MB)", used: Math.round(usage.attachmentMb * 10) / 10, limit: limits.attachmentMb },
  ];

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; usage</h1>
      <p className="mt-1 text-sm text-secondary">
        Current plan: <span className="font-medium text-ink">{limits.label}</span>
        {sub?.currentPeriodEnd && plan === "PRO" && (
          <> · renews {sub.currentPeriodEnd.toISOString().slice(0, 10)}</>
        )}
      </p>

      <div className="mt-6 space-y-4">
        {rows.map((r) => {
          const pct = Math.min(100, (r.used / r.limit) * 100);
          return (
            <div key={r.label}>
              <div className="flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                  {r.used} / {r.limit}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-border-soft">
                <div
                  className={`h-2 rounded-full ${pct >= 100 ? "bg-error" : pct > 80 ? "bg-accent-warm" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-sm text-secondary">Tasks created: {usage.tasks}</p>
      </div>

      {isAdmin && (
        <div className="mt-8 flex gap-3">
          {plan === "FREE" &&
            (stripeConfigured() ? (
              <form action={upgradeAction.bind(null, slug)}>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                  Upgrade to Pro
                </button>
              </form>
            ) : (
              <p className="text-sm text-secondary">
                Upgrading requires Stripe configuration (STRIPE_SECRET_KEY, STRIPE_PRICE_PRO,
                STRIPE_WEBHOOK_SECRET).
              </p>
            ))}
          {sub?.stripeCustomerId && (
            <form action={billingPortalAction.bind(null, slug)}>
              <button className="rounded-md border border-border-soft bg-surface px-4 py-2 text-sm font-medium hover:border-primary">
                Manage billing
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
