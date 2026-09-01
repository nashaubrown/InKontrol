// Org-scoped repositories for time tracking, goals, and forms (Phase 3).

import { prisma, withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";

// ---- Time tracking ----

export function getRunningTimer(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.timeEntry.findFirst({
      where: { organizationId: ctx.organizationId, userId: ctx.userId, endedAt: null },
      include: { task: { select: { id: true, title: true } } },
    })
  );
}

export function startTimer(ctx: OrgContext, taskId: string, billable: boolean) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    // One running timer per person: stop any existing one first.
    await tx.timeEntry.updateMany({
      where: { organizationId: ctx.organizationId, userId: ctx.userId, endedAt: null },
      data: { endedAt: new Date() },
    });
    return tx.timeEntry.create({
      data: {
        organizationId: ctx.organizationId,
        taskId,
        userId: ctx.userId,
        startedAt: new Date(),
        billable,
      },
    });
  });
}

export function stopTimer(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.timeEntry.updateMany({
      where: { organizationId: ctx.organizationId, userId: ctx.userId, endedAt: null },
      data: { endedAt: new Date() },
    })
  );
}

export function addManualEntry(
  ctx: OrgContext,
  input: { taskId: string; startedAt: Date; minutes: number; billable: boolean; note: string }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: input.taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    return tx.timeEntry.create({
      data: {
        organizationId: ctx.organizationId,
        taskId: input.taskId,
        userId: ctx.userId,
        startedAt: input.startedAt,
        endedAt: new Date(input.startedAt.getTime() + input.minutes * 60_000),
        billable: input.billable,
        note: input.note,
      },
    });
  });
}

export function getTimeEntries(ctx: OrgContext, taskId?: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.timeEntry.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(taskId ? { taskId } : { userId: ctx.userId }),
      },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        task: { select: { id: true, title: true, list: { select: { space: { select: { name: true } } } } } },
        user: { select: { name: true, email: true } },
      },
    })
  );
}

export function minutesOf(e: { startedAt: Date; endedAt: Date | null }) {
  return Math.round(((e.endedAt ?? new Date()).getTime() - e.startedAt.getTime()) / 60_000);
}

// ---- Workload ----

export async function getWorkload(ctx: OrgContext) {
  return withOrg(ctx.organizationId, async (tx) => {
    const members = await tx.membership.findMany({
      where: { organizationId: ctx.organizationId, role: { not: "GUEST" } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = [];
    for (const m of members) {
      const [openTasks, overdue, entries] = await Promise.all([
        tx.taskAssignee.count({
          where: {
            organizationId: ctx.organizationId,
            userId: m.userId,
            task: { status: { not: "DONE" } },
          },
        }),
        tx.taskAssignee.count({
          where: {
            organizationId: ctx.organizationId,
            userId: m.userId,
            task: { status: { not: "DONE" }, dueDate: { lt: new Date() } },
          },
        }),
        tx.timeEntry.findMany({
          where: {
            organizationId: ctx.organizationId,
            userId: m.userId,
            startedAt: { gte: weekAgo },
          },
          select: { startedAt: true, endedAt: true },
        }),
      ]);
      const minutes = entries.reduce((n, e) => n + minutesOf(e), 0);
      rows.push({
        user: m.user,
        role: m.role,
        openTasks,
        overdue,
        hoursThisWeek: Math.round((minutes / 60) * 10) / 10,
      });
    }
    return rows;
  });
}

// ---- Goals ----

export function listGoals(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.goal.findMany({
      where: { organizationId: ctx.organizationId },
      include: { keyResults: true, space: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function keyResultProgress(
  ctx: OrgContext,
  kr: { type: string; currentValue: number; targetValue: number; linkedListId: string | null }
) {
  if (kr.type === "task_linked" && kr.linkedListId) {
    const [done, total] = await withOrg(ctx.organizationId, (tx) =>
      Promise.all([
        tx.task.count({
          where: { organizationId: ctx.organizationId, listId: kr.linkedListId!, status: "DONE" },
        }),
        tx.task.count({
          where: { organizationId: ctx.organizationId, listId: kr.linkedListId! },
        }),
      ])
    );
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }
  return kr.targetValue === 0 ? 0 : Math.round((kr.currentValue / kr.targetValue) * 100);
}

export function createGoal(ctx: OrgContext, title: string, spaceId: string | null, targetDate: Date | null) {
  return withOrg(ctx.organizationId, async (tx) => {
    if (spaceId) {
      const s = await tx.space.findFirst({
        where: { id: spaceId, organizationId: ctx.organizationId },
      });
      if (!s) throw new Error("Space not found");
    }
    return tx.goal.create({
      data: {
        organizationId: ctx.organizationId,
        title,
        spaceId,
        targetDate,
        createdById: ctx.userId,
      },
    });
  });
}

export function addKeyResult(
  ctx: OrgContext,
  goalId: string,
  input: { title: string; type: "manual" | "task_linked"; targetValue: number; linkedListId?: string }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const goal = await tx.goal.findFirst({
      where: { id: goalId, organizationId: ctx.organizationId },
    });
    if (!goal) throw new Error("Goal not found");
    if (input.linkedListId) {
      const list = await tx.list.findFirst({
        where: { id: input.linkedListId, organizationId: ctx.organizationId },
      });
      if (!list) throw new Error("List not found");
    }
    return tx.keyResult.create({
      data: {
        organizationId: ctx.organizationId,
        goalId,
        title: input.title,
        type: input.type,
        targetValue: input.targetValue,
        linkedListId: input.linkedListId ?? null,
      },
    });
  });
}

export function updateKeyResultValue(ctx: OrgContext, keyResultId: string, currentValue: number) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.keyResult.updateMany({
      where: { id: keyResultId, organizationId: ctx.organizationId },
      data: { currentValue },
    })
  );
}

// ---- Forms ----

export function listForms(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.form.findMany({
      where: { organizationId: ctx.organizationId },
      include: { list: { select: { name: true, space: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    })
  );
}

export function createForm(ctx: OrgContext, listId: string, name: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const list = await tx.list.findFirst({
      where: { id: listId, organizationId: ctx.organizationId },
    });
    if (!list) throw new Error("List not found");
    return tx.form.create({
      data: { organizationId: ctx.organizationId, listId, name, createdById: ctx.userId },
    });
  });
}

export function deleteForm(ctx: OrgContext, formId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.form.deleteMany({ where: { id: formId, organizationId: ctx.organizationId } })
  );
}

/** Public lookup by unguessable publicId — used by the public intake page. */
export function getPublicForm(publicId: string) {
  return prisma.form.findFirst({
    where: { publicId, isPublic: true },
    include: {
      organization: { select: { name: true, brandColor: true, brandLogoUrl: true } },
      list: { include: { customFields: { orderBy: { createdAt: "asc" } } } },
    },
  });
}

/** Create a task from a public form submission (no session; validated + rate-limited by caller). */
export async function submitPublicForm(
  publicId: string,
  input: { title: string; description: string; fieldValues: { fieldId: string; value: string }[] }
) {
  const form = await getPublicForm(publicId);
  if (!form) throw new Error("Form not found");
  const validFieldIds = new Set(form.list.customFields.map((f) => f.id));
  return prisma.task.create({
    data: {
      organizationId: form.organizationId,
      listId: form.listId,
      title: input.title,
      description: input.description,
      createdById: form.createdById, // attributed to the form owner
      fieldValues: {
        create: input.fieldValues
          .filter((v) => validFieldIds.has(v.fieldId))
          .map((v) => ({
            organizationId: form.organizationId,
            fieldId: v.fieldId,
            value: v.value.slice(0, 2000),
          })),
      },
    },
  });
}
