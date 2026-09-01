"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { PROVIDERS, getTokens } from "@/lib/storage";
import { MAX_ATTACHMENT_BYTES } from "@/lib/repos/collab";
import { withOrg } from "@/lib/db";

export async function importCloudFileAction(
  orgSlug: string,
  taskId: string,
  provider: string,
  fileId: string,
  fileName: string
) {
  const ctx = await requireOrg(orgSlug);
  const p = PROVIDERS[z.string().parse(provider)];
  if (!p) throw new Error("Unknown provider");
  const tokens = await getTokens(ctx, provider);
  if (!tokens) throw new Error("Not connected");

  const { data, contentType } = await p.download(tokens, z.string().max(400).parse(fileId));
  if (data.length > MAX_ATTACHMENT_BYTES) throw new Error("File is larger than 4 MB");

  await withOrg(ctx.organizationId, async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, organizationId: ctx.organizationId },
    });
    if (!task) throw new Error("Task not found");
    await tx.attachment.create({
      data: {
        organizationId: ctx.organizationId,
        taskId,
        uploadedById: ctx.userId,
        fileName: z.string().max(255).parse(fileName),
        contentType,
        size: data.length,
        sourceType: provider,
        sourceId: fileId,
        data: new Uint8Array(data),
      },
    });
  });
  redirect(`/o/${orgSlug}/t/${taskId}`);
}
