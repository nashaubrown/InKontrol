// Billing + plan limits (Phase 1.6). Stripe activates when STRIPE_SECRET_KEY,
// STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET are set; without them every org
// runs on the Free plan. Limits are enforced server-side.

import { prisma } from "@/lib/db";

export const PLAN_LIMITS = {
  FREE: { members: 3, spaces: 2, attachmentMb: 50, label: "Free" },
  PRO: { members: 100, spaces: 100, attachmentMb: 5000, label: "Pro" },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_WEBHOOK_SECRET
  );
}

export async function getPlan(organizationId: string): Promise<PlanKey> {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) return "FREE";
  return sub.status === "active" || sub.status === "trialing" ? sub.plan : "FREE";
}

export async function getUsage(organizationId: string) {
  const [members, spaces, tasks, attachmentBytes] = await Promise.all([
    prisma.membership.count({ where: { organizationId, role: { not: "GUEST" } } }),
    prisma.space.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId } }),
    prisma.attachment.aggregate({ where: { organizationId }, _sum: { size: true } }),
  ]);
  return { members, spaces, tasks, attachmentMb: (attachmentBytes._sum.size ?? 0) / 1024 / 1024 };
}

export class PlanLimitError extends Error {}

export async function assertWithinLimit(
  organizationId: string,
  kind: "members" | "spaces" | "attachmentMb",
  nextValue: number
) {
  const plan = await getPlan(organizationId);
  const limit = PLAN_LIMITS[plan][kind];
  if (nextValue > limit) {
    throw new PlanLimitError(
      `The ${PLAN_LIMITS[plan].label} plan allows ${limit} ${kind === "attachmentMb" ? "MB of attachments" : kind}. Upgrade to add more.`
    );
  }
}

// ---- Minimal Stripe REST helpers (no SDK dependency) ----

async function stripeFetch(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe error (${res.status})`);
  return json;
}

export async function createCheckoutSession(organizationId: string, orgSlug: string, email: string) {
  const base = process.env.APP_URL ?? "";
  const session = await stripeFetch("checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": process.env.STRIPE_PRICE_PRO!,
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: organizationId,
    success_url: `${base}/o/${orgSlug}/settings/usage?billing=success`,
    cancel_url: `${base}/o/${orgSlug}/settings/usage?billing=cancelled`,
    "subscription_data[metadata][organizationId]": organizationId,
  });
  return session.url as string;
}

export async function createPortalSession(stripeCustomerId: string, orgSlug: string) {
  const base = process.env.APP_URL ?? "";
  const session = await stripeFetch("billing_portal/sessions", {
    customer: stripeCustomerId,
    return_url: `${base}/o/${orgSlug}/settings/usage`,
  });
  return session.url as string;
}
