"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostStatus, SocialPlatform } from "@prisma/client";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { publishTarget } from "@/lib/repos/social";
import { logActivity } from "@/lib/repos/collab";
import { emitEvent } from "@/lib/notify";
import { listMembers } from "@/lib/repos/orgs";

const platformSchema = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "X",
  "TIKTOK",
  "PINTEREST",
  "YOUTUBE",
  "GOOGLE_BUSINESS",
]);
const idSchema = z.string().min(1).max(64);

export async function createDemoAccountAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const platform = platformSchema.parse(formData.get("platform")) as SocialPlatform;
  const handle = z.string().trim().min(1).max(80).parse(formData.get("handle"));
  await social.createDemoAccount(ctx, platform, handle, handle);
  revalidatePath(`/o/${orgSlug}/social`);
}

export async function deleteAccountAction(orgSlug: string, accountId: string) {
  const ctx = await requireOrg(orgSlug);
  await social.deleteAccount(ctx, idSchema.parse(accountId));
  revalidatePath(`/o/${orgSlug}/social`);
}

export async function createPostAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const content = z.string().trim().min(1).max(5000).parse(formData.get("content"));
  const mediaUrl = z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .parse(formData.get("mediaUrl") ?? "");
  const accountIds = formData.getAll("accountIds").map(String).slice(0, 10);
  const scheduledRaw = formData.get("scheduledAt");
  const scheduledAt =
    typeof scheduledRaw === "string" && scheduledRaw ? new Date(scheduledRaw) : null;
  const post = await social.createPost(ctx, {
    content,
    mediaUrl: mediaUrl || undefined,
    accountIds,
    scheduledAt,
  });
  await logActivity(ctx, { type: "post_created", detail: content.slice(0, 80) });
  redirect(`/o/${orgSlug}/social/p/${post.id}`);
}

export async function setPostStatusAction(orgSlug: string, postId: string, status: string) {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .enum(["DRAFT", "PENDING_APPROVAL", "SCHEDULED"])
    .parse(status) as PostStatus;
  // Approving into the schedule is an Admin+ action (client-facing content gate).
  if (parsed === "SCHEDULED" && !hasAtLeastRole(ctx, "ADMIN")) {
    throw new Error("Only admins can approve and schedule posts");
  }
  const post = await social.setPostStatus(ctx, postId, parsed);
  if (parsed === "PENDING_APPROVAL") {
    const members = await listMembers(ctx);
    await emitEvent(ctx, {
      type: "automation",
      recipientUserIds: members
        .filter((m) => m.role === "ADMIN" || m.role === "OWNER")
        .map((m) => m.userId),
      title: "A post is waiting for approval",
      body: post.content?.slice(0, 120) ?? "",
      linkPath: `/o/${orgSlug}/social/p/${postId}`,
    });
  }
  revalidatePath(`/o/${orgSlug}/social/p/${postId}`);
  revalidatePath(`/o/${orgSlug}/social/posts`);
}

export async function publishNowAction(orgSlug: string, postId: string) {
  const ctx = await requireOrg(orgSlug);
  if (!hasAtLeastRole(ctx, "ADMIN")) throw new Error("Only admins can publish");
  const post = await social.getPost(ctx, postId);
  if (!post) throw new Error("Post not found");
  for (const t of post.targets) await publishTarget(t.id);
  await logActivity(ctx, { type: "post_published", detail: post.content.slice(0, 80) });
  revalidatePath(`/o/${orgSlug}/social/p/${postId}`);
}

export async function setScheduleAction(orgSlug: string, postId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const raw = formData.get("scheduledAt");
  const date = typeof raw === "string" && raw ? new Date(raw) : null;
  await social.setTargetSchedule(ctx, postId, date);
  revalidatePath(`/o/${orgSlug}/social/p/${postId}`);
}

export async function setOverrideAction(orgSlug: string, postId: string, targetId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const value = z.string().max(5000).parse(formData.get("contentOverride") ?? "");
  await social.setTargetOverride(ctx, idSchema.parse(targetId), value || null);
  revalidatePath(`/o/${orgSlug}/social/p/${postId}`);
}

export async function deletePostAction(orgSlug: string, postId: string) {
  const ctx = await requireOrg(orgSlug);
  await social.deletePost(ctx, postId);
  redirect(`/o/${orgSlug}/social/posts`);
}

export async function addCompetitorAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const platform = platformSchema.parse(formData.get("platform")) as SocialPlatform;
  const handle = z.string().trim().min(1).max(80).parse(formData.get("handle"));
  await social.addCompetitor(ctx, platform, handle);
  revalidatePath(`/o/${orgSlug}/social/competitors`);
}

export async function addCompetitorSnapshotAction(
  orgSlug: string,
  competitorId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug);
  const followers = z.coerce.number().int().min(0).max(1_000_000_000).parse(formData.get("followers"));
  const engagement = z.coerce.number().min(0).max(100).parse(formData.get("engagementRate"));
  await social.addCompetitorSnapshot(ctx, idSchema.parse(competitorId), followers, engagement);
  revalidatePath(`/o/${orgSlug}/social/competitors`);
}
