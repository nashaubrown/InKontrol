// Lightweight automation engine (Phase 1.4). Rules run inline on the trigger —
// no background job infrastructure needed at this scale.

import type { TaskPriority } from "@prisma/client";
import { withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";
import { emitEvent } from "@/lib/notify";

const PRIORITIES = new Set(["URGENT", "HIGH", "NORMAL", "LOW"]);

export async function runStatusAutomations(
  ctx: OrgContext,
  task: { id: string; listId: string; title: string },
  newStatus: string
) {
  const rules = await withOrg(ctx.organizationId, (tx) =>
    tx.automationRule.findMany({
      where: {
        organizationId: ctx.organizationId,
        listId: task.listId,
        enabled: true,
        triggerType: "status_becomes",
        triggerValue: newStatus,
      },
    })
  );

  for (const rule of rules) {
    if (rule.actionType === "set_priority" && PRIORITIES.has(rule.actionValue)) {
      await withOrg(ctx.organizationId, (tx) =>
        tx.task.updateMany({
          where: { id: task.id, organizationId: ctx.organizationId },
          data: { priority: rule.actionValue as TaskPriority },
        })
      );
    } else if (rule.actionType === "assign_user" || rule.actionType === "notify_user") {
      const membership = await withOrg(ctx.organizationId, (tx) =>
        tx.membership.findFirst({
          where: { organizationId: ctx.organizationId, userId: rule.actionValue },
        })
      );
      if (!membership) continue;
      if (rule.actionType === "assign_user") {
        await withOrg(ctx.organizationId, (tx) =>
          tx.taskAssignee.upsert({
            where: { taskId_userId: { taskId: task.id, userId: rule.actionValue } },
            create: {
              organizationId: ctx.organizationId,
              taskId: task.id,
              userId: rule.actionValue,
            },
            update: {},
          })
        );
      }
      await emitEvent(ctx, {
        type: rule.actionType === "assign_user" ? "task_assigned" : "automation",
        recipientUserIds: [rule.actionValue],
        title:
          rule.actionType === "assign_user"
            ? `You were assigned: ${task.title}`
            : `Rule "${rule.name}": ${task.title} is now ${newStatus.toLowerCase().replaceAll("_", " ")}`,
        linkPath: `/o/${ctx.orgSlug}/t/${task.id}`,
      });
    }
  }
}
