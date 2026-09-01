"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationChannel } from "@prisma/client";
import { prisma, withOrg } from "@/lib/db";
import { requireOrg, requireUser } from "@/lib/tenant";

export async function markAllReadAction(orgSlug: string) {
  const ctx = await requireOrg(orgSlug);
  await withOrg(ctx.organizationId, (tx) =>
    tx.notification.updateMany({
      where: { organizationId: ctx.organizationId, userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    })
  );
  revalidatePath(`/o/${orgSlug}/inbox`);
}

export async function setPreferenceAction(
  orgSlug: string,
  eventType: string,
  channel: string,
  enabled: boolean
) {
  const ctx = await requireOrg(orgSlug);
  const parsedChannel = z
    .enum(["IN_APP", "EMAIL", "TELEGRAM", "WHATSAPP"])
    .parse(channel) as NotificationChannel;
  const parsedType = z.string().max(50).parse(eventType);
  await withOrg(ctx.organizationId, (tx) =>
    tx.notificationPreference.upsert({
      where: {
        userId_organizationId_eventType_channel: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          eventType: parsedType,
          channel: parsedChannel,
        },
      },
      create: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: parsedType,
        channel: parsedChannel,
        enabled,
      },
      update: { enabled },
    })
  );
  revalidatePath(`/o/${orgSlug}/settings/notifications`);
}

/** Create (or return) the user's Telegram link code, shown once in settings. */
export async function getTelegramLinkCodeAction() {
  const { userId } = await requireUser();
  const existing = await prisma.telegramLink.findUnique({ where: { userId } });
  if (existing) return { code: existing.linkCode, linked: Boolean(existing.chatId) };
  const code = randomBytes(12).toString("base64url");
  await prisma.telegramLink.create({ data: { userId, linkCode: code } });
  return { code, linked: false };
}

// ---- Automation rules ----

export async function createAutomationAction(orgSlug: string, listId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      triggerValue: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      actionType: z.enum(["set_priority", "assign_user", "notify_user"]),
      actionValue: z.string().min(1).max(64),
    })
    .parse({
      name: formData.get("name"),
      triggerValue: formData.get("triggerValue"),
      actionType: formData.get("actionType"),
      actionValue: formData.get("actionValue"),
    });
  await withOrg(ctx.organizationId, async (tx) => {
    const list = await tx.list.findFirst({
      where: { id: listId, organizationId: ctx.organizationId },
    });
    if (!list) throw new Error("List not found");
    await tx.automationRule.create({
      data: {
        organizationId: ctx.organizationId,
        listId,
        name: parsed.name,
        triggerType: "status_becomes",
        triggerValue: parsed.triggerValue,
        actionType: parsed.actionType,
        actionValue: parsed.actionValue,
      },
    });
  });
  revalidatePath(`/o/${orgSlug}/l/${listId}`);
}

export async function deleteAutomationAction(orgSlug: string, listId: string, ruleId: string) {
  const ctx = await requireOrg(orgSlug);
  await withOrg(ctx.organizationId, (tx) =>
    tx.automationRule.deleteMany({
      where: { id: ruleId, organizationId: ctx.organizationId },
    })
  );
  revalidatePath(`/o/${orgSlug}/l/${listId}`);
}
