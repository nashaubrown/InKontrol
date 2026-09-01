import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Stripe webhook with manual signature verification (security brief §4).
// Configure the endpoint in Stripe for: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted.

function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // 5 min tolerance
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const payload = await req.text();
  if (!verifySignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const organizationId = String(obj.client_reference_id ?? "");
    if (organizationId) {
      await prisma.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          plan: "PRO",
          status: "active",
          stripeCustomerId: (obj.customer as string) ?? null,
          stripeSubscriptionId: (obj.subscription as string) ?? null,
        },
        update: {
          plan: "PRO",
          status: "active",
          stripeCustomerId: (obj.customer as string) ?? null,
          stripeSubscriptionId: (obj.subscription as string) ?? null,
        },
      });
    }
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subId = String(obj.id ?? "");
    const status = event.type === "customer.subscription.deleted" ? "canceled" : String(obj.status ?? "active");
    const metadata = (obj.metadata ?? {}) as Record<string, string>;
    const periodEnd = obj.current_period_end ? new Date(Number(obj.current_period_end) * 1000) : null;
    const where = metadata.organizationId
      ? { organizationId: metadata.organizationId }
      : { stripeSubscriptionId: subId };
    await prisma.subscription
      .update({
        where: where as { organizationId: string },
        data: {
          status,
          currentPeriodEnd: periodEnd,
          plan: status === "active" || status === "trialing" ? "PRO" : "FREE",
        },
      })
      .catch(() => {}); // unknown subscription: nothing to update
  }

  return NextResponse.json({ received: true });
}
