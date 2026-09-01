// Generic outbound webhooks (Phase 5.2). Payloads are HMAC-SHA256 signed with
// each endpoint's secret (X-InKontrol-Signature: sha256=<hex>), so receivers can
// verify authenticity. Zapier/Make-compatible: plain JSON POST.

import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

export const WEBHOOK_EVENTS = [
  "task.created",
  "task.status_changed",
  "comment.created",
  "post.published",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export async function deliverWebhooks(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, enabled: true, events: { has: event } },
  });
  if (endpoints.length === 0) return;
  const body = JSON.stringify({ event, occurredAt: new Date().toISOString(), data: payload });
  await Promise.allSettled(
    endpoints.map(async (ep) => {
      const signature = createHmac("sha256", ep.secret).update(body).digest("hex");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-InKontrol-Event": event,
            "X-InKontrol-Signature": `sha256=${signature}`,
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        console.error(`webhook delivery to ${ep.url} failed`, err instanceof Error ? err.message : err);
      } finally {
        clearTimeout(timer);
      }
    })
  );
}
