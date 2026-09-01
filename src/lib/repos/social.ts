// Org-scoped repository layer for social accounts, posts, and analytics (Phase 2).

import type { PostStatus, SocialPlatform } from "@prisma/client";
import { prisma, withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";
import { getAdapter } from "@/lib/social/adapters";
import { deliverWebhooks } from "@/lib/webhooks";

export function listAccounts(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialAccount.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "asc" },
      include: { snapshots: { orderBy: { date: "desc" }, take: 14 } },
    })
  );
}

export function createDemoAccount(
  ctx: OrgContext,
  platform: SocialPlatform,
  handle: string,
  displayName: string
) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialAccount.create({
      data: {
        organizationId: ctx.organizationId,
        platform,
        handle,
        displayName,
        isDemo: true,
        createdById: ctx.userId,
      },
    })
  );
}

export function deleteAccount(ctx: OrgContext, accountId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialAccount.deleteMany({ where: { id: accountId, organizationId: ctx.organizationId } })
  );
}

const postInclude = {
  targets: { include: { socialAccount: true, analytics: true } },
  linkedTask: { select: { id: true, title: true, status: true } },
  createdBy: { select: { name: true, email: true } },
} as const;

export function listPosts(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialPost.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: postInclude,
    })
  );
}

export function getPost(ctx: OrgContext, postId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialPost.findFirst({
      where: { id: postId, organizationId: ctx.organizationId },
      include: postInclude,
    })
  );
}

export function createPost(
  ctx: OrgContext,
  input: {
    content: string;
    mediaUrl?: string;
    accountIds: string[];
    scheduledAt?: Date | null;
    linkedTaskId?: string;
  }
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const accounts = await tx.socialAccount.findMany({
      where: { id: { in: input.accountIds }, organizationId: ctx.organizationId },
    });
    if (accounts.length === 0) throw new Error("Pick at least one account");
    if (input.linkedTaskId) {
      const task = await tx.task.findFirst({
        where: { id: input.linkedTaskId, organizationId: ctx.organizationId },
      });
      if (!task) throw new Error("Linked task not found");
    }
    return tx.socialPost.create({
      data: {
        organizationId: ctx.organizationId,
        content: input.content,
        mediaUrl: input.mediaUrl ?? null,
        linkedTaskId: input.linkedTaskId ?? null,
        createdById: ctx.userId,
        targets: {
          create: accounts.map((a) => ({
            organizationId: ctx.organizationId,
            socialAccountId: a.id,
            scheduledAt: input.scheduledAt ?? null,
          })),
        },
      },
    });
  });
}

/** Draft -> Pending approval -> Scheduled -> Published/Failed. */
export function setPostStatus(ctx: OrgContext, postId: string, status: PostStatus) {
  return withOrg(ctx.organizationId, async (tx) => {
    const post = await tx.socialPost.findFirst({
      where: { id: postId, organizationId: ctx.organizationId },
      include: { targets: true },
    });
    if (!post) throw new Error("Post not found");
    if (status === "SCHEDULED" && post.targets.some((t) => !t.scheduledAt)) {
      throw new Error("Set a schedule time first");
    }
    await tx.socialPost.update({ where: { id: postId }, data: { status } });
    await tx.postTarget.updateMany({
      where: { postId, organizationId: ctx.organizationId, status: { not: "PUBLISHED" } },
      data: { status },
    });
    return post;
  });
}

export function setTargetSchedule(ctx: OrgContext, postId: string, scheduledAt: Date | null) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.postTarget.updateMany({
      where: { postId, organizationId: ctx.organizationId, status: { not: "PUBLISHED" } },
      data: { scheduledAt },
    })
  );
}

export function setTargetOverride(
  ctx: OrgContext,
  targetId: string,
  contentOverride: string | null
) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.postTarget.updateMany({
      where: { id: targetId, organizationId: ctx.organizationId },
      data: { contentOverride },
    })
  );
}

export function deletePost(ctx: OrgContext, postId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialPost.deleteMany({ where: { id: postId, organizationId: ctx.organizationId } })
  );
}

/** Publish one target immediately (used by "publish now" and by the cron). Not org-ctx-bound: cron scope. */
export async function publishTarget(targetId: string) {
  const target = await prisma.postTarget.findUnique({
    where: { id: targetId },
    include: { post: true, socialAccount: true },
  });
  if (!target || target.status === "PUBLISHED") return;
  const adapter = getAdapter(target.socialAccount);
  try {
    const result = await adapter.publish(
      target.socialAccount,
      target.contentOverride ?? target.post.content,
      target.post.mediaUrl
    );
    await prisma.postTarget.update({
      where: { id: targetId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId: result.externalId,
        errorMessage: null,
      },
    });
    await deliverWebhooks(target.organizationId, "post.published", {
      postId: target.postId,
      account: target.socialAccount.handle,
      platform: target.socialAccount.platform,
    });
  } catch (err) {
    await prisma.postTarget.update({
      where: { id: targetId },
      data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Publish failed" },
    });
  }
  // Roll the parent post status up from its targets.
  const targets = await prisma.postTarget.findMany({ where: { postId: target.postId } });
  const next: PostStatus = targets.some((t) => t.status === "FAILED")
    ? "FAILED"
    : targets.every((t) => t.status === "PUBLISHED")
      ? "PUBLISHED"
      : target.post.status;
  await prisma.socialPost.update({ where: { id: target.postId }, data: { status: next } });
}

// ---- Calendar (posts + tasks merged) ----

export async function getUnifiedCalendar(ctx: OrgContext, from: Date, to: Date) {
  return withOrg(ctx.organizationId, async (tx) => {
    const [tasks, targets] = await Promise.all([
      tx.task.findMany({
        where: {
          organizationId: ctx.organizationId,
          dueDate: { gte: from, lt: to },
          list: {
            spaceId: ctx.guestSpaceIds === null ? undefined : { in: ctx.guestSpaceIds },
          },
        },
        select: { id: true, title: true, status: true, dueDate: true },
        take: 500,
      }),
      tx.postTarget.findMany({
        where: { organizationId: ctx.organizationId, scheduledAt: { gte: from, lt: to } },
        include: { post: { select: { id: true, content: true, status: true } }, socialAccount: true },
        take: 500,
      }),
    ]);
    return { tasks, targets };
  });
}

// ---- Analytics ----

export function getAccountAnalytics(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.socialAccount.findMany({
      where: { organizationId: ctx.organizationId },
      include: { snapshots: { orderBy: { date: "asc" }, take: 30 } },
    })
  );
}

export function getPublishedTargetAnalytics(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.postTarget.findMany({
      where: { organizationId: ctx.organizationId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 50,
      include: { post: true, socialAccount: true, analytics: true },
    })
  );
}

/** Best time to post: average engagement (likes+comments) by weekday/hour of published targets. */
export async function bestTimesToPost(ctx: OrgContext) {
  const targets = await getPublishedTargetAnalytics(ctx);
  const buckets = new Map<string, { total: number; n: number }>();
  for (const t of targets) {
    if (!t.publishedAt || !t.analytics) continue;
    const d = t.publishedAt;
    const key = `${d.getUTCDay()}:${d.getUTCHours()}`;
    const score = t.analytics.likes + t.analytics.comments * 3 + t.analytics.shares * 2;
    const b = buckets.get(key) ?? { total: 0, n: 0 };
    b.total += score;
    b.n += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .map(([key, b]) => {
      const [day, hour] = key.split(":").map(Number);
      return { day, hour, avgScore: b.total / b.n, samples: b.n };
    })
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5);
}

// ---- Competitors ----

export function listCompetitors(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.competitorProfile.findMany({
      where: { organizationId: ctx.organizationId },
      include: { snapshots: { orderBy: { date: "desc" }, take: 2 } },
      orderBy: { createdAt: "asc" },
    })
  );
}

export function addCompetitor(ctx: OrgContext, platform: SocialPlatform, handle: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.competitorProfile.upsert({
      where: {
        organizationId_platform_handle: { organizationId: ctx.organizationId, platform, handle },
      },
      create: { organizationId: ctx.organizationId, platform, handle },
      update: {},
    })
  );
}

export function addCompetitorSnapshot(
  ctx: OrgContext,
  competitorId: string,
  followers: number,
  engagementRate: number
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const comp = await tx.competitorProfile.findFirst({
      where: { id: competitorId, organizationId: ctx.organizationId },
    });
    if (!comp) throw new Error("Competitor not found");
    return tx.competitorSnapshot.create({
      data: { organizationId: ctx.organizationId, competitorId, followers, engagementRate },
    });
  });
}
