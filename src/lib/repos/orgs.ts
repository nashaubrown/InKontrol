import { createHash, randomBytes } from "crypto";
import { Role } from "@prisma/client";
import { prisma, withOrg } from "@/lib/db";
import { hasAtLeastRole, type OrgContext } from "@/lib/tenant";
import { assertWithinLimit } from "@/lib/billing";

const INVITE_TTL_MS = 1000 * 60 * 60 * 48; // 48h, single-use

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "org"
  );
}

export async function createOrganization(userId: string, name: string) {
  const base = slugify(name);
  // suffix on collision
  let slug = base;
  for (let i = 0; await prisma.organization.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
    if (i > 5) throw new Error("Could not allocate slug");
  }
  return prisma.organization.create({
    data: {
      name,
      slug,
      memberships: { create: { userId, role: Role.OWNER } },
      workspaces: { create: { name: "Main workspace" } },
    },
  });
}

export function listUserOrgs(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

export function listMembers(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.membership.findMany({
      where: { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    })
  );
}

export function listPendingInvites(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.invite.findMany({
      where: {
        organizationId: ctx.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

/** Create a single-use, short-expiry invite. Returns the raw token exactly once.
 *  For GUEST invites, guestSpaceIds lists the spaces the guest may access. */
export async function createInvite(
  ctx: OrgContext,
  email: string,
  role: Role,
  guestSpaceIds: string[] = []
) {
  if (!hasAtLeastRole(ctx, Role.ADMIN)) throw new Error("Admins only");
  if (role === Role.OWNER) throw new Error("Cannot invite as Owner");
  if (role === Role.GUEST && guestSpaceIds.length === 0)
    throw new Error("Pick at least one space for a guest invite");
  if (role !== Role.GUEST) {
    const seats = await prisma.membership.count({
      where: { organizationId: ctx.organizationId, role: { not: "GUEST" } },
    });
    await assertWithinLimit(ctx.organizationId, "members", seats + 1);
  }
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await withOrg(ctx.organizationId, async (tx) => {
    if (role === Role.GUEST) {
      const spaces = await tx.space.count({
        where: { id: { in: guestSpaceIds }, organizationId: ctx.organizationId },
      });
      if (spaces !== guestSpaceIds.length) throw new Error("Space not found");
    }
    await tx.invite.create({
      data: {
        organizationId: ctx.organizationId,
        email: email.toLowerCase(),
        role,
        guestSpaceIds: role === Role.GUEST ? guestSpaceIds : [],
        tokenHash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: ctx.userId,
      },
    });
    await tx.activityLogEntry.create({
      data: {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        type: role === Role.GUEST ? "guest_invite_created" : "invite_created",
        detail: `${email.toLowerCase()} as ${role.toLowerCase()}`,
      },
    });
  });
  return token;
}

/** Accept an invite by raw token. Not org-scoped: the token itself is the capability. */
export async function acceptInvite(userId: string, userEmail: string, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("Invite is invalid or expired");
  }
  if (invite.email !== userEmail.toLowerCase()) {
    throw new Error("This invite was issued for a different email address");
  }
  await prisma.$transaction([
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    prisma.membership.upsert({
      where: {
        organizationId_userId: { organizationId: invite.organizationId, userId },
      },
      create: { organizationId: invite.organizationId, userId, role: invite.role },
      update: {},
    }),
    ...(invite.role === "GUEST"
      ? invite.guestSpaceIds.map((spaceId) =>
          prisma.guestAccess.upsert({
            where: { userId_spaceId: { userId, spaceId } },
            create: { organizationId: invite.organizationId, userId, spaceId },
            update: {},
          })
        )
      : []),
  ]);
  return invite.organization;
}
