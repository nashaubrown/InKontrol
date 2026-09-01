"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import * as collab from "@/lib/repos/collab";

export async function addCommentAction(orgSlug: string, taskId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const body = z.string().trim().min(1).max(10_000).parse(formData.get("body"));
  await collab.addComment(ctx, taskId, body);
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function deleteAttachmentAction(orgSlug: string, taskId: string, attachmentId: string) {
  const ctx = await requireOrg(orgSlug);
  await collab.deleteAttachment(ctx, z.string().max(64).parse(attachmentId));
  revalidatePath(`/o/${orgSlug}/t/${taskId}`);
}

export async function createDocAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const title = z.string().trim().min(1).max(200).parse(formData.get("title"));
  const taskId = z.string().max(64).optional().parse(formData.get("taskId") || undefined);
  const listId = z.string().max(64).optional().parse(formData.get("listId") || undefined);
  const doc = await collab.createDoc(ctx, { title, taskId, listId });
  redirect(`/o/${orgSlug}/d/${doc.id}`);
}

export async function saveDocAction(
  orgSlug: string,
  docId: string,
  input: { title: string; content: unknown }
) {
  const ctx = await requireOrg(orgSlug);
  const title = z.string().trim().min(1).max(200).parse(input.title);
  // Content is a ProseMirror JSON document rendered only through Tiptap (never as raw
  // HTML), which prevents stored XSS from document content.
  const content = z.record(z.string(), z.unknown()).parse(input.content);
  await collab.updateDoc(ctx, docId, { title, content: content as never });
  revalidatePath(`/o/${orgSlug}/docs`);
}

export async function deleteDocAction(orgSlug: string, docId: string) {
  const ctx = await requireOrg(orgSlug);
  await collab.deleteDoc(ctx, docId);
  redirect(`/o/${orgSlug}/docs`);
}
