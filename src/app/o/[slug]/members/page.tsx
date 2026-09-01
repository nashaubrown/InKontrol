import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { listMembers, listPendingInvites } from "@/lib/repos/orgs";
import { withOrg } from "@/lib/db";
import { InviteForm } from "@/components/invite-form";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [members, invites, spaces] = await Promise.all([
    listMembers(ctx),
    hasAtLeastRole(ctx, "ADMIN") ? listPendingInvites(ctx) : Promise.resolve([]),
    withOrg(ctx.organizationId, (tx) =>
      tx.space.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      })
    ),
  ]);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <ul className="mt-6 divide-y divide-border-soft rounded-lg border border-border-soft bg-surface">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{m.user.name ?? m.user.email}</p>
              <p className="text-xs text-secondary">{m.user.email}</p>
            </div>
            <span className="text-xs text-secondary">{m.role.toLowerCase()}</span>
          </li>
        ))}
      </ul>

      {hasAtLeastRole(ctx, "ADMIN") && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Invite someone</h2>
          <p className="mt-1 text-sm text-secondary">
            Invites are single-use links that expire after 48 hours.
          </p>
          <InviteForm orgSlug={slug} spaces={spaces} />
          {invites.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-medium">Pending invites</h3>
              <ul className="mt-2 space-y-1 text-sm text-secondary">
                {invites.map((i) => (
                  <li key={i.id}>
                    {i.email} — {i.role.toLowerCase()}, expires{" "}
                    {i.expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
