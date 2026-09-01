import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getHierarchy } from "@/lib/repos/hierarchy";
import { withOrg } from "@/lib/db";
import { signOutAction } from "@/lib/actions";
import { Sidebar } from "@/components/sidebar";
import { GuestWelcome } from "@/components/guest-welcome";
import { prisma } from "@/lib/db";

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

  const [workspaces, unread, org] = await Promise.all([
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
  ]);
  const isGuest = ctx.role === "GUEST";
  // White-label: guests see the agency's accent color and logo instead of ours.
  const brandStyle =
    isGuest && org?.brandColor
      ? ({ "--color-primary": org.brandColor } as React.CSSProperties)
      : undefined;

  return (
    <div className="flex min-h-screen" style={brandStyle}>
      <aside className="flex w-72 flex-col border-r border-border-soft bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          {isGuest && org?.brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.brandLogoUrl} alt={ctx.orgName} className="h-6 max-w-40 object-contain" />
          ) : (
            <Link href="/orgs" className="font-semibold tracking-tight text-primary">
              {isGuest ? ctx.orgName : "InKontrol"}
            </Link>
          )}
          <form action={signOutAction}>
            <button className="text-xs text-secondary hover:text-ink">Sign out</button>
          </form>
        </div>
        <div className="border-b border-border-soft px-4 py-3">
          <p className="text-sm font-medium">{ctx.orgName}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
            <Link href={`/o/${slug}`} className="hover:text-primary">
              Overview
            </Link>
            {!isGuest && (
              <>
                <Link href={`/o/${slug}/dashboard`} className="hover:text-primary">
                  Dashboard
                </Link>
                <Link href={`/o/${slug}/time`} className="hover:text-primary">
                  Time
                </Link>
                <Link href={`/o/${slug}/workload`} className="hover:text-primary">
                  Workload
                </Link>
                <Link href={`/o/${slug}/goals`} className="hover:text-primary">
                  Goals
                </Link>
                <Link href={`/o/${slug}/forms`} className="hover:text-primary">
                  Forms
                </Link>
              </>
            )}
            {!isGuest && (
              <>
                <Link href={`/o/${slug}/members`} className="hover:text-primary">
                  Members
                </Link>
              </>
            )}
            <Link href={`/o/${slug}/inbox`} className="hover:text-primary">
              Inbox{unread > 0 ? ` (${unread})` : ""}
            </Link>
            <Link href={`/o/${slug}/calendar`} className="hover:text-primary">
              Calendar
            </Link>
            <Link href={`/o/${slug}/reports`} className="hover:text-primary">
              Reports
            </Link>
            {!isGuest && (
              <>
                <Link href={`/o/${slug}/social`} className="hover:text-primary">
                  Social
                </Link>
                <Link href={`/o/${slug}/docs`} className="hover:text-primary">
                  Docs
                </Link>
                <Link href={`/o/${slug}/activity`} className="hover:text-primary">
                  Activity
                </Link>
                <Link href={`/o/${slug}/templates`} className="hover:text-primary">
                  Templates
                </Link>
                <Link href={`/o/${slug}/settings`} className="hover:text-primary">
                  Settings
                </Link>
              </>
            )}
            <Link href={`/o/${slug}/search`} className="hover:text-primary">
              Search
            </Link>
          </div>
        </div>
        <Sidebar orgSlug={slug} workspaces={workspaces} canManage={ctx.role !== "GUEST"} />
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
