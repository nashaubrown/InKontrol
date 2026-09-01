"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, withOrg } from "@/lib/db";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";

export async function completeOnboardingAction(orgSlug: string) {
  const ctx = await requireOrg(orgSlug);
  await prisma.membership.update({
    where: { organizationId_userId: { organizationId: ctx.organizationId, userId: ctx.userId } },
    data: { onboardedAt: new Date() },
  });
  revalidatePath(`/o/${orgSlug}`);
}

export async function updateBrandingAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  const parsed = z
    .object({
      brandColor: z
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .or(z.literal("")),
      brandLogoUrl: z.string().trim().url().max(500).or(z.literal("")),
    })
    .parse({
      brandColor: formData.get("brandColor") ?? "",
      brandLogoUrl: formData.get("brandLogoUrl") ?? "",
    });
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      brandColor: parsed.brandColor || null,
      brandLogoUrl: parsed.brandLogoUrl || null,
    },
  });
  revalidatePath(`/o/${orgSlug}`);
}

export async function updateGuestSpacesAction(orgSlug: string, userId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  const spaceIds = formData
    .getAll("guestSpaceIds")
    .map(String)
    .filter((s) => /^[a-z0-9]+$/i.test(s))
    .slice(0, 50);
  await withOrg(ctx.organizationId, async (tx) => {
    const membership = await tx.membership.findFirst({
      where: { organizationId: ctx.organizationId, userId, role: "GUEST" },
    });
    if (!membership) throw new Error("Guest not found");
    const valid = await tx.space.findMany({
      where: { id: { in: spaceIds }, organizationId: ctx.organizationId },
      select: { id: true },
    });
    await tx.guestAccess.deleteMany({
      where: { organizationId: ctx.organizationId, userId },
    });
    await tx.guestAccess.createMany({
      data: valid.map((s) => ({
        organizationId: ctx.organizationId,
        userId,
        spaceId: s.id,
      })),
    });
  });
  revalidatePath(`/o/${orgSlug}/members`);
}
