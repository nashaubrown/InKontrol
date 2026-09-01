import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { withOrg } from "@/lib/db";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { revokeApiKeyAction, deleteWebhookAction } from "@/lib/integration-actions";
import { ApiKeyForm, WebhookForm } from "@/components/integration-forms";

export default async function IntegrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  if (!hasAtLeastRole(ctx, "ADMIN")) {
    return <p className="text-sm text-secondary">Admins only.</p>;
  }
  const [keys, webhooks] = await Promise.all([
    withOrg(ctx.organizationId, (tx) =>
      tx.apiKey.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      })
    ),
    withOrg(ctx.organizationId, (tx) =>
      tx.webhookEndpoint.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      })
    ),
  ]);
  const base = process.env.APP_URL ?? "";

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">API &amp; webhooks</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">API keys</h2>
        <p className="mt-1 text-xs text-secondary">
          Use the REST API from your own tools: <code>GET {base}/api/v1/tasks</code>,{" "}
          <code>POST {base}/api/v1/tasks</code>, <code>GET {base}/api/v1/posts</code> with{" "}
          <code>Authorization: Bearer ik_…</code>. 120 requests/min per key.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between rounded-md border border-border-soft bg-surface px-3 py-2"
            >
              <span>
                {k.name} <code className="text-xs text-secondary">{k.prefix}…</code>{" "}
                <span className="rounded bg-border-soft/60 px-1.5 text-xs">{k.scope}</span>
                {k.revokedAt && <span className="ml-1 rounded bg-error/40 px-1.5 text-xs">revoked</span>}
              </span>
              {!k.revokedAt && (
                <form action={revokeApiKeyAction.bind(null, slug, k.id)}>
                  <button className="text-xs text-secondary hover:text-ink">revoke</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <ApiKeyForm orgSlug={slug} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Outbound webhooks</h2>
        <p className="mt-1 text-xs text-secondary">
          POSTs signed with <code>X-InKontrol-Signature: sha256=&lt;hmac&gt;</code> on each event —
          works with Zapier, Make, or your own receivers.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between rounded-md border border-border-soft bg-surface px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate">{w.url}</span>
                <span className="text-xs text-secondary">{w.events.join(", ")}</span>
              </span>
              <form action={deleteWebhookAction.bind(null, slug, w.id)}>
                <button className="text-xs text-secondary hover:text-ink">delete</button>
              </form>
            </li>
          ))}
        </ul>
        <WebhookForm orgSlug={slug} events={[...WEBHOOK_EVENTS]} />
      </section>
    </div>
  );
}
