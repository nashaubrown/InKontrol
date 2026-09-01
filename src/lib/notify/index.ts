// Notification dispatch layer (Phase 1.4).
// One event bus: emitEvent() fans out to channel adapters based on each
// recipient's NotificationPreference rows. In-app is always available;
// email and Telegram activate when their env vars are set (see .env.example).

import { prisma, withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";
import { sendWhatsApp } from "./whatsapp";

export const EVENT_TYPES = [
  { type: "task_assigned", label: "You are assigned a task" },
  { type: "comment_mention", label: "Someone mentions you in a comment" },
  { type: "comment_on_task", label: "A comment is added to your task" },
  { type: "automation", label: "An automation rule notifies you" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["type"];

const CHANNELS = ["IN_APP", "EMAIL", "TELEGRAM", "WHATSAPP"] as const;

export async function emitEvent(
  ctx: OrgContext,
  event: {
    type: EventType;
    recipientUserIds: string[];
    title: string;
    body?: string;
    linkPath?: string;
  }
) {
  const recipients = [...new Set(event.recipientUserIds)].filter((id) => id !== ctx.userId);
  if (recipients.length === 0) return;

  const prefs = await withOrg(ctx.organizationId, (tx) =>
    tx.notificationPreference.findMany({
      where: {
        organizationId: ctx.organizationId,
        userId: { in: recipients },
        eventType: event.type,
      },
    })
  );

  function enabled(userId: string, channel: (typeof CHANNELS)[number]) {
    const p = prefs.find((x) => x.userId === userId && x.channel === channel);
    // Default: in-app on, email on, chat channels off until explicitly enabled
    if (!p) return channel === "IN_APP" || channel === "EMAIL";
    return p.enabled;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: recipients } },
    include: { telegramLink: true },
  });

  await withOrg(ctx.organizationId, (tx) =>
    tx.notification.createMany({
      data: recipients
        .filter((id) => enabled(id, "IN_APP"))
        .map((userId) => ({
          organizationId: ctx.organizationId,
          userId,
          type: event.type,
          title: event.title,
          body: event.body ?? "",
          linkPath: event.linkPath ?? "",
        })),
    })
  );

  // External channels are best-effort; never fail the user action over them.
  await Promise.allSettled(
    users.flatMap((user) => {
      const jobs: Promise<unknown>[] = [];
      if (enabled(user.id, "EMAIL")) {
        jobs.push(sendEmail(user.email, event.title, event.body ?? "", event.linkPath));
      }
      if (enabled(user.id, "TELEGRAM") && user.telegramLink?.chatId) {
        jobs.push(sendTelegram(user.telegramLink.chatId, `${event.title}\n${event.body ?? ""}`));
      }
      if (enabled(user.id, "WHATSAPP")) {
        jobs.push(sendWhatsApp(user.email, event.title));
      }
      return jobs;
    })
  );
}
