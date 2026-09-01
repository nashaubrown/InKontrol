"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { createCheckoutSession, createPortalSession, stripeConfigured } from "@/lib/billing";
import { logActivity } from "@/lib/repos/collab";

export async function upgradeAction(orgSlug: string) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  if (!stripeConfigured()) throw new Error("Billing is not configured");
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  const url = await createCheckoutSession(ctx.organizationId, orgSlug, user?.email ?? "");
  await logActivity(ctx, { type: "billing_checkout_started" });
  redirect(url);
}

export async function billingPortalAction(orgSlug: string) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: ctx.organizationId },
  });
  if (!sub?.stripeCustomerId) throw new Error("No billing account yet");
  const url = await createPortalSession(sub.stripeCustomerId, orgSlug);
  redirect(url);
}
