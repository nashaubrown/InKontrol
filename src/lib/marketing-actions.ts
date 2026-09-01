"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withOrg } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";

export async function addKeywordAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .object({
      keyword: z.string().trim().min(1).max(120),
      targetUrl: z.string().trim().url().max(300),
    })
    .parse({ keyword: formData.get("keyword"), targetUrl: formData.get("targetUrl") });
  await withOrg(ctx.organizationId, (tx) =>
    tx.trackedKeyword.upsert({
      where: {
        organizationId_keyword_targetUrl: {
          organizationId: ctx.organizationId,
          keyword: parsed.keyword,
          targetUrl: parsed.targetUrl,
        },
      },
      create: { organizationId: ctx.organizationId, ...parsed },
      update: {},
    })
  );
  revalidatePath(`/o/${orgSlug}/marketing`);
}

export async function addRankSnapshotAction(orgSlug: string, keywordId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const position = z.coerce.number().int().min(1).max(1000).parse(formData.get("position"));
  await withOrg(ctx.organizationId, async (tx) => {
    const kw = await tx.trackedKeyword.findFirst({
      where: { id: keywordId, organizationId: ctx.organizationId },
    });
    if (!kw) throw new Error("Keyword not found");
    await tx.keywordRankSnapshot.create({
      data: { organizationId: ctx.organizationId, keywordId, position },
    });
  });
  revalidatePath(`/o/${orgSlug}/marketing`);
}
