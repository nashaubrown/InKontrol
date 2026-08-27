import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type OrgContext = {
  userId: string;
  organizationId: string;
  orgSlug: string;
  orgName: string;
  role: Role;
};

/** Require a signed-in user, or redirect to sign-in. */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return { userId: session.user.id, email: session.user.email ?? null };
});

/**
 * Resolve the org from the URL slug and verify the signed-in user is a member.
 * The organizationId used for all queries comes from this membership check —
 * never from client input.
 */
export const requireOrg = cache(async (orgSlug: string): Promise<OrgContext> => {
  const { userId } = await requireUser();
  const membership = await prisma.membership.findFirst({
    where: { userId, organization: { slug: orgSlug } },
    include: { organization: true },
  });
  if (!membership) redirect("/orgs");
  return {
    userId,
    organizationId: membership.organizationId,
    orgSlug: membership.organization.slug,
    orgName: membership.organization.name,
    role: membership.role,
  };
});

const roleRank: Record<Role, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

export function hasAtLeastRole(ctx: OrgContext, min: Role): boolean {
  return roleRank[ctx.role] >= roleRank[min];
}
