"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withOrg } from "@/lib/db";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { generateApiKey } from "@/lib/api-auth";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { logActivity } from "@/lib/repos/collab";

export type KeyState = { error?: string; rawKey?: string; webhookSecret?: string } | undefined;

export async function createApiKeyAction(
  orgSlug: string,
  _prev: KeyState,
  formData: FormData
): Promise<KeyState> {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) return { error: "Admins only" };
  const parsed = z
    .object({ name: z.string().trim().min(1).max(80), scope: z.enum(["read", "read_write"]) })
    .safeParse({ name: formData.get("name"), scope: formData.get("scope") });
  if (!parsed.success) return { error: "Name and scope are required" };
  const { raw, hash, prefix } = generateApiKey();
  await withOrg(ctx.organizationId, (tx) =>
    tx.apiKey.create({
      data: {
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        keyHash: hash,
        prefix,
        scope: parsed.data.scope,
        createdById: ctx.userId,
      },
    })
  );
  await logActivity(ctx, { type: "api_key_created", detail: parsed.data.name });
  revalidatePath(`/o/${orgSlug}/settings/integrations`);
  return { rawKey: raw };
}

export async function revokeApiKeyAction(orgSlug: string, keyId: string) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  await withOrg(ctx.organizationId, (tx) =>
    tx.apiKey.updateMany({
      where: { id: keyId, organizationId: ctx.organizationId },
      data: { revokedAt: new Date() },
    })
  );
  await logActivity(ctx, { type: "api_key_revoked" });
  revalidatePath(`/o/${orgSlug}/settings/integrations`);
}

export async function createWebhookAction(
  orgSlug: string,
  _prev: KeyState,
  formData: FormData
): Promise<KeyState> {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) return { error: "Admins only" };
  const url = z.string().trim().url().max(500).safeParse(formData.get("url"));
  if (!url.success) return { error: "Enter a valid https URL" };
  if (!url.data.startsWith("https://")) return { error: "Webhook URLs must use https" };
  const events = formData
    .getAll("events")
    .map(String)
    .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (events.length === 0) return { error: "Pick at least one event" };
  const secret = randomBytes(24).toString("base64url");
  await withOrg(ctx.organizationId, (tx) =>
    tx.webhookEndpoint.create({
      data: {
        organizationId: ctx.organizationId,
        url: url.data,
        secret,
        events,
        createdById: ctx.userId,
      },
    })
  );
  await logActivity(ctx, { type: "webhook_created", detail: url.data });
  revalidatePath(`/o/${orgSlug}/settings/integrations`);
  return { webhookSecret: secret };
}

export async function deleteWebhookAction(orgSlug: string, webhookId: string) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  await withOrg(ctx.organizationId, (tx) =>
    tx.webhookEndpoint.deleteMany({
      where: { id: webhookId, organizationId: ctx.organizationId },
    })
  );
  revalidatePath(`/o/${orgSlug}/settings/integrations`);
}
