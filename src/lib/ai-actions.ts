"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, withOrg } from "@/lib/db";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { aiConfigured, suggestCaptions, rewriteInBrandVoice } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export type AiState =
  | { error?: string; captions?: string[]; hashtags?: string[]; rewritten?: string }
  | undefined;

export async function suggestCaptionsAction(
  orgSlug: string,
  _prev: AiState,
  formData: FormData
): Promise<AiState> {
  const ctx = await requireOrg(orgSlug);
  if (!aiConfigured()) return { error: "AI assistance needs ANTHROPIC_API_KEY configured." };
  if (!checkRateLimit(`ai:${ctx.userId}`, 15, 60_000)) return { error: "Slow down a little." };
  const parsed = z
    .object({
      topic: z.string().trim().min(1).max(1000),
      platform: z.string().max(30).default("Instagram"),
    })
    .safeParse({ topic: formData.get("topic"), platform: formData.get("platform") ?? "Instagram" });
  if (!parsed.success) return { error: "Describe the post first." };

  const [org, recent] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { brandVoice: true },
    }),
    withOrg(ctx.organizationId, (tx) =>
      tx.socialPost.findMany({
        where: { organizationId: ctx.organizationId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { content: true },
      })
    ),
  ]);
  try {
    const result = await suggestCaptions({
      topic: parsed.data.topic,
      platform: parsed.data.platform,
      brandVoice: org?.brandVoice ?? "",
      examplePosts: recent.map((p) => p.content.slice(0, 300)),
    });
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI request failed" };
  }
}

export async function rewriteAction(
  orgSlug: string,
  _prev: AiState,
  formData: FormData
): Promise<AiState> {
  const ctx = await requireOrg(orgSlug);
  if (!aiConfigured()) return { error: "AI assistance needs ANTHROPIC_API_KEY configured." };
  if (!checkRateLimit(`ai:${ctx.userId}`, 15, 60_000)) return { error: "Slow down a little." };
  const text = z.string().trim().min(1).max(5000).safeParse(formData.get("text"));
  if (!text.success) return { error: "Paste a caption first." };
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { brandVoice: true },
  });
  try {
    return { rewritten: await rewriteInBrandVoice({ text: text.data, brandVoice: org?.brandVoice ?? "" }) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI request failed" };
  }
}

export async function saveBrandVoiceAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Admins only");
  const voice = z.string().max(2000).parse(formData.get("brandVoice") ?? "");
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { brandVoice: voice },
  });
  revalidatePath(`/o/${orgSlug}/social/ai`);
}
