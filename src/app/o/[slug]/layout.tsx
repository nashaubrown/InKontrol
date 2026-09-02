import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getHierarchy } from "@/lib/repos/hierarchy";
import { withOrg, prisma } from "@/lib/db";
import { signOutAction } from "@/lib/actions";
import { Sidebar } from "@/components/sidebar";
import { AppNav } from "@/components/app-nav";
import { GuestWelcome } from "@/components/guest-welcome";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);

  // Client-portal onboarding: first-time guests see the wizard instead of the app.
  if (ctx.role === "GUEST" && !ctx.onboarded) {
    const spaces = await withOrg(ctx.organizationId, (tx) =>
      tx.space.findMany({
        where: { id: { in: ctx.guestSpaceIds ?? [] } },
        select: { name: true },
      })
    );
    return (
      <GuestWelcome orgSlug={slug} orgName={ctx.orgName} spaceNames={spaces.map((s) => s.name)} />
    );
  }

  const [workspaces, unread, org, user] = await Promise.all([
    getHierarchy(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.notification.count({
        where: { organizationId: ctx.organizationId, userId: ctx.userId, readAt: null },
      })
    ),
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { brandColor: true, brandLogoUrl: true },
    }),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    }),
  ]);
  const isGuest = ctx.role === "GUEST";
  // White-label: guests see the agency's accent color and logo instead of ours.
  const brandStyle =
    isGuest && org?.brandColor
      ? ({ "--color-primary": org.brandColor } as React.CSSProperties)
      : undefined;

  return (
    <div className="flex min-h-screen" style={brandStyle}>
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border-soft bg-surface">
        <div className="flex items-center gap-2 px-5 pb-3 pt-5">
          {isGuest && org?.brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.brandLogoUrl} alt={ctx.orgName} className="h-6 max-w-40 object-contain" />
          ) : (
            <Link href="/orgs" className="text-lg font-semibold tracking-tight text-primary">
              {isGuest ? ctx.orgName : "InKontrol"}
            </Link>
          )}
        </div>
        {!isGuest && (
          <Link
            href="/orgs"
            className="mx-3 mb-1 flex items-center justify-between rounded-md border border-border-soft bg-canvas px-3 py-2 text-[13px] font-medium hover:border-primary"
            title="Switch organization"
          >
            <span className="truncate">{ctx.orgName}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 text-secondary">
              <path d="m8 9 4-4 4 4m-8 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}

        <div className="flex-1 overflow-y-auto">
          <AppNav orgSlug={slug} isGuest={isGuest} unread={unread} />
          <div className="mx-3 my-2 border-t border-border-soft" />
          <p className="px-5 pb-1 text-[11px] font-medium uppercase tracking-wider text-secondary/80">
            Spaces
          </p>
          <Sidebar orgSlug={slug} workspaces={workspaces} canManage={ctx.role !== "GUEST"} />
        </div>

        <div className="flex items-center justify-between border-t border-border-soft px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{user?.name ?? user?.email}</p>
            <p className="truncate text-[11px] text-secondary">{user?.email}</p>
          </div>
          <form action={signOutAction}>
            <button
              className="rounded-md p-1.5 text-secondary hover:bg-canvas hover:text-ink"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-4xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
