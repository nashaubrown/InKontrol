// Org-scoped repository layer for tasks (Phase 1.2).
// Same rules as hierarchy.ts: OrgContext comes from the session server-side,
// every query runs inside withOrg() so Postgres RLS applies, and parent-record
// lookups are org-scoped so a foreign ID behaves like a missing one.

import type { TaskStatus, TaskPriority, CustomFieldType, Prisma } from "@prisma/client";
import { withOrg } from "@/lib/db";
import { spaceScope, type OrgContext } from "@/lib/tenant";

const taskInclude = {
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  subtasks: { orderBy: { position: "asc" as const } },
  fieldValues: true,
} satisfies Prisma.TaskInclude;

export function getList(ctx: OrgContext, listId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.list.findFirst({
      where: { id: listId, organizationId: ctx.organizationId, spaceId: spaceScope(ctx) },
      include: { space: true, folder: true, customFields: { orderBy: { createdAt: "asc" } } },
    })
  );
}

export function getTasksForList(ctx: OrgContext, listId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        listId,
        parentTaskId: null,
        list: { spaceId: spaceScope(ctx) },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: taskInclude,
    })
  );
}

export function getTask(ctx: OrgContext, taskId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId, list: { spaceId: spaceScope(ctx) } },
      include: {
        ...taskInclude,
        list: { include: { space: true, customFields: { orderBy: { createdAt: "asc" } } } },
        parentTask: { select: { id: true, title: true } },
        subtasks: { orderBy: { position: "asc" }, include: taskInclude },
        blocking: { include: { blocked: { select: { id: true, title: true, status: true } } } },
        blockedBy: { include: { blocker: { select: { id: true, title: true, status: true } } } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
  );
}

export function createTask(
  ctx: OrgContext,
  input: {
    listId: string;
    title: string;
    parentTaskId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
  }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const list = await tx.list.findFirst({
      where: { id: input.listId, organizationId: ctx.organizationId },
    });
    if (!list) throw new Error("List not found");
    if (input.parentTaskId) {
      const parent = await tx.task.findFirst({
        where: { id: input.parentTaskId, organizationId: ctx.organizationId, listId: input.listId },
      });
      if (!parent) throw new Error("Parent task not found");
    }
    const max = await tx.task.aggregate({
      where: { organizationId: ctx.organizationId, listId: input.listId },
      _max: { position: true },
    });
    return tx.task.create({
      data: {
        organizationId: ctx.organizationId,
        listId: input.listId,
        parentTaskId: input.parentTaskId ?? null,
        title: input.title,
        status: input.status ?? "TODO",
        priority: input.priority ?? "NORMAL",
        dueDate: input.dueDate ?? null,
        position: (max._max.position ?? 0) + 1,
        createdById: ctx.userId,
      },
    });
  });
}

export function updateTask(
  ctx: OrgContext,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    position: number;
  }>
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    return tx.task.update({ where: { id: taskId }, data });
  });
}

export function deleteTask(ctx: OrgContext, taskId: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    return tx.task.delete({ where: { id: taskId } });
  });
}

export function setAssignee(ctx: OrgContext, taskId: string, userId: string, assigned: boolean) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    const membership = await tx.membership.findFirst({
      where: { organizationId: ctx.organizationId, userId },
    });
    if (!membership) throw new Error("User is not a member of this organization");
    if (assigned) {
      return tx.taskAssignee.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: { organizationId: ctx.organizationId, taskId, userId },
        update: {},
      });
    }
    return tx.taskAssignee.deleteMany({ where: { taskId, userId, organizationId: ctx.organizationId } });
  });
}

export function createCustomField(
  ctx: OrgContext,
  listId: string,
  name: string,
  type: CustomFieldType,
  options: string[]
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const list = await tx.list.findFirst({
      where: { id: listId, organizationId: ctx.organizationId },
    });
    if (!list) throw new Error("List not found");
    return tx.customField.create({
      data: { organizationId: ctx.organizationId, listId, name, type, options },
    });
  });
}

export function setFieldValue(ctx: OrgContext, taskId: string, fieldId: string, value: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    const field = await tx.customField.findFirst({
      where: { id: fieldId, organizationId: ctx.organizationId, listId: task.listId },
    });
    if (!field) throw new Error("Field not found");
    return tx.customFieldValue.upsert({
      where: { taskId_fieldId: { taskId, fieldId } },
      create: { organizationId: ctx.organizationId, taskId, fieldId, value },
      update: { value },
    });
  });
}

export function addDependency(ctx: OrgContext, blockerId: string, blockedId: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    if (blockerId === blockedId) throw new Error("A task cannot block itself");
    const [blocker, blocked] = await Promise.all([
      tx.task.findFirst({ where: { id: blockerId, organizationId: ctx.organizationId } }),
      tx.task.findFirst({ where: { id: blockedId, organizationId: ctx.organizationId } }),
    ]);
    if (!blocker || !blocked) throw new Error("Task not found");
    const inverse = await tx.taskDependency.findFirst({
      where: { blockerId: blockedId, blockedId: blockerId },
    });
    if (inverse) throw new Error("These tasks already depend on each other the other way");
    return tx.taskDependency.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { organizationId: ctx.organizationId, blockerId, blockedId },
      update: {},
    });
  });
}

export function removeDependency(ctx: OrgContext, dependencyId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.taskDependency.deleteMany({
      where: { id: dependencyId, organizationId: ctx.organizationId },
    })
  );
}

/** Org-wide search across task titles and descriptions. */
export function searchTasks(ctx: OrgContext, query: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        list: { spaceId: spaceScope(ctx) },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { list: { include: { space: true } } },
    })
  );
}

/** All tasks with due dates in a month window, for the calendar view. */
export function getTasksForCalendar(ctx: OrgContext, listId: string, from: Date, to: Date) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        listId,
        dueDate: { gte: from, lt: to },
        list: { spaceId: spaceScope(ctx) },
      },
      orderBy: { dueDate: "asc" },
      include: taskInclude,
    })
  );
}
