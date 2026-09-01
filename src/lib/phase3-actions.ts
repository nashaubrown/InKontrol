"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import * as p3 from "@/lib/repos/phase3";

const idSchema = z.string().min(1).max(64);

export async function startTimerAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  await p3.startTimer(ctx, taskId, formData.get("billable") !== "no");
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
  revalidatePath(`/o/${orgSlug}/time`);
}

export async function stopTimerAction(orgSlug: string, backPath: string) {
  const ctx = await requireOrg(orgSlug);
  await p3.stopTimer(ctx);
  revalidatePath(backPath);
  revalidatePath(`/o/${orgSlug}/time`);
}

export async function addManualEntryAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      minutes: z.coerce.number().int().min(1).max(24 * 60),
      billable: z.string().optional(),
      note: z.string().max(300).default(""),
    })
    .parse({
      date: formData.get("date"),
      minutes: formData.get("minutes"),
      billable: formData.get("billable") ?? undefined,
      note: formData.get("note") ?? "",
    });
  await p3.addManualEntry(ctx, {
    taskId,
    startedAt: new Date(parsed.date),
    minutes: parsed.minutes,
    billable: parsed.billable !== "no",
    note: parsed.note,
  });
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
  revalidatePath(`/o/${orgSlug}/time`);
}

export async function createGoalAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const title = z.string().trim().min(1).max(200).parse(formData.get("title"));
  const spaceIdRaw = formData.get("spaceId");
  const spaceId = typeof spaceIdRaw === "string" && spaceIdRaw ? idSchema.parse(spaceIdRaw) : null;
  const dateRaw = formData.get("targetDate");
  const targetDate = typeof dateRaw === "string" && dateRaw ? new Date(dateRaw) : null;
  await p3.createGoal(ctx, title, spaceId, targetDate);
  revalidatePath(`/o/${orgSlug}/goals`);
}

export async function addKeyResultAction(orgSlug: string, goalId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      type: z.enum(["manual", "task_linked"]),
      targetValue: z.coerce.number().min(0).max(1_000_000_000).default(100),
      linkedListId: z.string().max(64).optional(),
    })
    .parse({
      title: formData.get("title"),
      type: formData.get("type"),
      targetValue: formData.get("targetValue") || 100,
      linkedListId: (formData.get("linkedListId") as string) || undefined,
    });
  await p3.addKeyResult(ctx, goalId, {
    title: parsed.title,
    type: parsed.type,
    targetValue: parsed.targetValue,
    linkedListId: parsed.type === "task_linked" ? parsed.linkedListId : undefined,
  });
  revalidatePath(`/o/${orgSlug}/goals`);
}

export async function updateKeyResultAction(orgSlug: string, keyResultId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const value = z.coerce.number().min(0).max(1_000_000_000).parse(formData.get("currentValue"));
  await p3.updateKeyResultValue(ctx, keyResultId, value);
  revalidatePath(`/o/${orgSlug}/goals`);
}

export async function createFormAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const listId = idSchema.parse(formData.get("listId"));
  const name = z.string().trim().min(1).max(120).parse(formData.get("name"));
  await p3.createForm(ctx, listId, name);
  revalidatePath(`/o/${orgSlug}/forms`);
}

export async function deleteFormAction(orgSlug: string, formId: string) {
  const ctx = await requireOrg(orgSlug);
  await p3.deleteForm(ctx, formId);
  revalidatePath(`/o/${orgSlug}/forms`);
}
