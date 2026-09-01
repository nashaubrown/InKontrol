import Link from "next/link";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { updateBrandingAction } from "@/lib/portal-actions";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const isAdmin = hasAtLeastRole(ctx, "ADMIN");
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { brandColor: true, brandLogoUrl: true },
  });

  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const dropboxConfigured = Boolean(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET);
  const secretsConfigured = Boolean(process.env.SECRETS_KEY);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm">
        <Link href={`/o/${slug}/settings/notifications`} className="text-primary hover:underline">
          Your notification settings →
        </Link>
      </p>

      {isAdmin && (
        <section className="mt-6 rounded-lg border border-border-soft bg-surface p-4">
          <h2 className="text-sm font-semibold">Client portal branding</h2>
          <p className="mt-1 text-xs text-secondary">
            Guests see your logo and accent color instead of InKontrol&apos;s.
          </p>
          <form action={updateBrandingAction.bind(null, slug)} className="mt-3 space-y-3 text-sm">
            <label className="block">
              <span className="text-xs text-secondary">Accent color (hex)</span>
              <input
                name="brandColor"
                defaultValue={org?.brandColor ?? ""}
                placeholder="#369AAC"
                className="mt-1 w-40 rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs text-secondary">Logo URL</span>
              <input
                name="brandLogoUrl"
                defaultValue={org?.brandLogoUrl ?? ""}
                placeholder="https://youragency.com/logo.png"
                className="mt-1 w-full rounded-md border border-border-soft px-3 py-1.5 outline-none focus:border-primary"
              />
            </label>
            <button className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white hover:opacity-90">
              Save branding
            </button>
          </form>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border-soft bg-surface p-4 text-sm">
        <h2 className="font-semibold">Cloud storage import</h2>
        <p className="mt-1 text-xs text-secondary">
          Import files from Google Drive or Dropbox into task attachments. Each integration
          activates once its OAuth app credentials are set in the environment.
        </p>
        <ul className="mt-3 space-y-2">
          <li className="flex items-center gap-2">
            Google Drive —{" "}
            {!secretsConfigured || !googleConfigured ? (
              <span className="rounded bg-accent-warm/60 px-1.5 text-xs">
                needs {!secretsConfigured ? "SECRETS_KEY + " : ""}GOOGLE_CLIENT_ID/SECRET
              </span>
            ) : (
              <a
                href={`/api/integrations/google_drive/connect?org=${slug}`}
                className="text-primary hover:underline"
              >
                Connect your Google Drive →
              </a>
            )}
          </li>
          <li className="flex items-center gap-2">
            Dropbox —{" "}
            {!secretsConfigured || !dropboxConfigured ? (
              <span className="rounded bg-accent-warm/60 px-1.5 text-xs">
                needs {!secretsConfigured ? "SECRETS_KEY + " : ""}DROPBOX_APP_KEY/SECRET
              </span>
            ) : (
              <a
                href={`/api/integrations/dropbox/connect?org=${slug}`}
                className="text-primary hover:underline"
              >
                Connect your Dropbox →
              </a>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}
