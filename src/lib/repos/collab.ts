// Org-scoped repository layer for comments, activity, attachments, docs (Phase 1.3).

import type { Prisma } from "@prisma/client";
import { withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";

async function requireTask(
  tx: Prisma.TransactionClient,
  ctx: OrgContext,
  taskId: string
) {
  const task = await tx.task.findFirst({
    where: { id: taskId, organizationId: ctx.organizationId },
  });
  if (!task) throw new Error("Task not found");
  return task;
}

// ---- Comments ----

export function getComments(ctx: OrgContext, taskId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.comment.findMany({
      where: { organizationId: ctx.organizationId, taskId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, email: true } } },
    })
  );
}

export function addComment(ctx: OrgContext, taskId: string, body: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    await requireTask(tx, ctx, taskId);
    const comment = await tx.comment.create({
      data: { organizationId: ctx.organizationId, taskId, authorId: ctx.userId, body },
    });
    await tx.activityLogEntry.create({
      data: {
        organizationId: ctx.organizationId,
        taskId,
        actorId: ctx.userId,
        type: "comment",
        detail: body.slice(0, 120),
      },
    });
    return comment;
  });
}

/** Members whose @name or @email appears in the comment body. */
export function findMentionedMembers(
  body: string,
  members: { userId: string; name: string | null; email: string }[]
) {
  const lower = body.toLowerCase();
  return members.filter((m) => {
    const nameTag = m.name ? `@${m.name.toLowerCase()}` : null;
    const emailTag = `@${m.email.toLowerCase()}`;
    return (nameTag && lower.includes(nameTag)) || lower.includes(emailTag);
  });
}

// ---- Activity ----

export function logActivity(
  ctx: OrgContext,
  entry: { taskId?: string; type: string; detail?: string }
) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.activityLogEntry.create({
      data: {
        organizationId: ctx.organizationId,
        taskId: entry.taskId ?? null,
        actorId: ctx.userId,
        type: entry.type,
        detail: entry.detail ?? "",
      },
    })
  );
}

export function getTaskActivity(ctx: OrgContext, taskId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.activityLogEntry.findMany({
      where: { organizationId: ctx.organizationId, taskId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true, email: true } } },
    })
  );
}

export function getOrgActivity(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.activityLogEntry.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    })
  );
}

// ---- Attachments ----

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // Vercel request body limit territory

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function addAttachment(
  ctx: OrgContext,
  taskId: string,
  file: { fileName: string; contentType: string; data: Buffer }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    await requireTask(tx, ctx, taskId);
    if (file.data.length > MAX_ATTACHMENT_BYTES) throw new Error("File is larger than 4 MB");
    if (!ALLOWED_TYPES.has(file.contentType)) throw new Error("File type not allowed");
    return tx.attachment.create({
      data: {
        organizationId: ctx.organizationId,
        taskId,
        uploadedById: ctx.userId,
        fileName: file.fileName.slice(0, 255),
        contentType: file.contentType,
        size: file.data.length,
        data: new Uint8Array(file.data),
      },
      select: { id: true, fileName: true },
    });
  });
}

export function getAttachmentsMeta(ctx: OrgContext, taskId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.attachment.findMany({
      where: { organizationId: ctx.organizationId, taskId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        size: true,
        sourceType: true,
        createdAt: true,
        uploadedBy: { select: { name: true, email: true } },
      },
    })
  );
}

export function getAttachmentData(ctx: OrgContext, attachmentId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.attachment.findFirst({
      where: { id: attachmentId, organizationId: ctx.organizationId },
    })
  );
}

export function deleteAttachment(ctx: OrgContext, attachmentId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.attachment.deleteMany({
      where: { id: attachmentId, organizationId: ctx.organizationId },
    })
  );
}

// ---- Docs ----

export function listDocs(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.doc.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        space: { select: { name: true } },
        list: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        createdBy: { select: { name: true, email: true } },
      },
    })
  );
}

export function getDoc(ctx: OrgContext, docId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.doc.findFirst({ where: { id: docId, organizationId: ctx.organizationId } })
  );
}

export function createDoc(
  ctx: OrgContext,
  input: { title: string; spaceId?: string; listId?: string; taskId?: string }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    if (input.spaceId) {
      const s = await tx.space.findFirst({
        where: { id: input.spaceId, organizationId: ctx.organizationId },
      });
      if (!s) throw new Error("Space not found");
    }
    if (input.listId) {
      const l = await tx.list.findFirst({
        where: { id: input.listId, organizationId: ctx.organizationId },
      });
      if (!l) throw new Error("List not found");
    }
    if (input.taskId) await requireTask(tx, ctx, input.taskId);
    return tx.doc.create({
      data: {
        organizationId: ctx.organizationId,
        title: input.title,
        spaceId: input.spaceId ?? null,
        listId: input.listId ?? null,
        taskId: input.taskId ?? null,
        createdById: ctx.userId,
      },
    });
  });
}

export function updateDoc(
  ctx: OrgContext,
  docId: string,
  data: { title?: string; content?: Prisma.InputJsonValue }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const doc = await tx.doc.findFirst({
      where: { id: docId, organizationId: ctx.organizationId },
    });
    if (!doc) throw new Error("Doc not found");
    return tx.doc.update({ where: { id: docId }, data });
  });
}

export function deleteDoc(ctx: OrgContext, docId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.doc.deleteMany({ where: { id: docId, organizationId: ctx.organizationId } })
  );
}
