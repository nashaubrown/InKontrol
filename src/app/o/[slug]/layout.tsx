import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { getHierarchy } from "@/lib/repos/hierarchy";
import { withOrg } from "@/lib/db";
import { signOutAction } from "@/lib/actions";
import { Sidebar } from "@/components/sidebar";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [workspaces, unread] = await Promise.all([
    getHierarchy(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.notification.count({
        where: { organizationId: ctx.organizationId, userId: ctx.userId, readAt: null },
      })
    ),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-72 flex-col border-r border-border-soft bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <Link href="/orgs" className="font-semibold tracking-tight text-primary">
            InKontrol
          </Link>
          <form action={signOutAction}>
            <button className="text-xs text-secondary hover:text-ink">Sign out</button>
          </form>
        </div>
        <div className="border-b border-border-soft px-4 py-3">
          <p className="text-sm font-medium">{ctx.orgName}</p>
          <div className="mt-1 flex gap-3 text-xs text-secondary">
            <Link href={`/o/${slug}`} className="hover:text-primary">
              Overview
            </Link>
            <Link href={`/o/${slug}/members`} className="hover:text-primary">
              Members
            </Link>
            <Link href={`/o/${slug}/inbox`} className="hover:text-primary">
              Inbox{unread > 0 ? ` (${unread})` : ""}
            </Link>
            <Link href={`/o/${slug}/docs`} className="hover:text-primary">
              Docs
            </Link>
            <Link href={`/o/${slug}/activity`} className="hover:text-primary">
              Activity
            </Link>
            <Link href={`/o/${slug}/search`} className="hover:text-primary">
              Search
            </Link>
          </div>
        </div>
        <Sidebar orgSlug={slug} workspaces={workspaces} canManage={ctx.role !== "MEMBER"} />
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
