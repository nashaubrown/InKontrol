"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { CustomFieldType, TaskPriority, TaskStatus } from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import * as tasks from "@/lib/repos/tasks";
import { logActivity } from "@/lib/repos/collab";
import { emitEvent } from "@/lib/notify";
import { runStatusAutomations } from "@/lib/automations";

const titleSchema = z.string().trim().min(1).max(300);
const statusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
const prioritySchema = z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]);
const idSchema = z.string().min(1).max(64);

function listPath(orgSlug: string, listId: string) {
  return `/o/${orgSlug}/l/${listId}`;
}

export async function createTaskAction(orgSlug: string, listId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const title = titleSchema.parse(formData.get("title"));
  const status = statusSchema.optional().catch(undefined).parse(formData.get("status") ?? undefined);
  const due = formData.get("dueDate");
  const task = await tasks.createTask(ctx, {
    listId,
    title,
    status: status as TaskStatus | undefined,
    dueDate: typeof due === "string" && due ? new Date(due) : null,
  });
  await logActivity(ctx, { taskId: task.id, type: "created_task", detail: title.slice(0, 120) });
  revalidatePath(listPath(orgSlug, listId));
}

export async function createSubtaskAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const title = titleSchema.parse(formData.get("title"));
  const parent = await tasks.getTask(ctx, taskId);
  if (!parent) throw new Error("Task not found");
  await tasks.createTask(ctx, { listId: parent.listId, title, parentTaskId: taskId });
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function updateTaskFieldsAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const data: Record<string, unknown> = {};
  if (formData.has("title")) data.title = titleSchema.parse(formData.get("title"));
  if (formData.has("description"))
    data.description = z.string().max(50_000).parse(formData.get("description"));
  if (formData.has("status")) data.status = statusSchema.parse(formData.get("status"));
  if (formData.has("priority")) data.priority = prioritySchema.parse(formData.get("priority"));
  if (formData.has("dueDate")) {
    const raw = formData.get("dueDate");
    data.dueDate = typeof raw === "string" && raw ? new Date(raw) : null;
  }
  const task = await tasks.updateTask(ctx, taskId, data);
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
  revalidatePath(listPath(orgSlug, task.listId));
}

export async function setTaskStatusAction(orgSlug: string, taskId: string, status: string) {
  const ctx = await requireOrg(orgSlug);
  const parsed = statusSchema.parse(status);
  const task = await tasks.updateTask(ctx, taskId, { status: parsed as TaskStatus });
  await logActivity(ctx, { taskId, type: "changed_status", detail: parsed.toLowerCase() });
  await runStatusAutomations(ctx, task, parsed);
  revalidatePath(listPath(orgSlug, task.listId));
}

export async function deleteTaskAction(orgSlug: string, taskId: string) {
  const ctx = await requireOrg(orgSlug);
  const task = await tasks.getTask(ctx, taskId);
  if (!task) return;
  await tasks.deleteTask(ctx, taskId);
  revalidatePath(listPath(orgSlug, task.listId));
  redirect(listPath(orgSlug, task.listId));
}

export async function toggleAssigneeAction(
  orgSlug: string,
  taskId: string,
  userId: string,
  assigned: boolean
) {
  const ctx = await requireOrg(orgSlug);
  await tasks.setAssignee(ctx, taskId, idSchema.parse(userId), assigned);
  if (assigned) {
    const task = await tasks.getTask(ctx, taskId);
    if (task) {
      await emitEvent(ctx, {
        type: "task_assigned",
        recipientUserIds: [userId],
        title: `You were assigned: ${task.title}`,
        linkPath: `/o/${orgSlug}/t/${taskId}`,
      });
    }
  }
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function createCustomFieldAction(orgSlug: string, listId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const name = z.string().trim().min(1).max(80).parse(formData.get("name"));
  const type = z
    .enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"])
    .parse(formData.get("type")) as CustomFieldType;
  const optionsRaw = z.string().max(1000).catch("").parse(formData.get("options") ?? "");
  const options =
    type === "SELECT"
      ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 30)
      : [];
  await tasks.createCustomField(ctx, listId, name, type, options);
  revalidatePath(listPath(orgSlug, listId));
}

export async function setFieldValueAction(orgSlug: string, taskId: string, fieldId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const value = z.string().max(2000).parse(formData.get("value") ?? "");
  await tasks.setFieldValue(ctx, taskId, idSchema.parse(fieldId), value);
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function addDependencyAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const otherId = idSchema.parse(formData.get("otherTaskId"));
  const direction = z.enum(["blocks", "blocked_by"]).parse(formData.get("direction"));
  if (direction === "blocks") await tasks.addDependency(ctx, taskId, otherId);
  else await tasks.addDependency(ctx, otherId, taskId);
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function removeDependencyAction(orgSlug: string, taskId: string, dependencyId: string) {
  const ctx = await requireOrg(orgSlug);
  await tasks.removeDependency(ctx, idSchema.parse(dependencyId));
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function setTaskPriorityAction(orgSlug: string, taskId: string, priority: string) {
  const ctx = await requireOrg(orgSlug);
  const parsed = prioritySchema.parse(priority);
  const task = await tasks.updateTask(ctx, taskId, { priority: parsed as TaskPriority });
  revalidatePath(listPath(orgSlug, task.listId));
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}
