import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishTarget } from "@/lib/repos/social";
import { getAdapter } from "@/lib/social/adapters";

export const maxDuration = 60;

// Scheduled work (Vercel Cron, see vercel.json): publish due posts, refresh
// post metrics, and take one account analytics snapshot per day.
// Vercel calls with Authorization: Bearer $CRON_SECRET.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Publish targets whose schedule time has passed.
  const due = await prisma.postTarget.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true },
    take: 25,
  });
  for (const t of due) await publishTarget(t.id);

  // 2. Refresh metrics for recently published targets (metrics ramp for ~72h).
  const published = await prisma.postTarget.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: new Date(now.getTime() - 72 * 3600 * 1000) },
      externalId: { not: null },
    },
    include: { socialAccount: true },
    take: 50,
  });
  for (const t of published) {
    const adapter = getAdapter(t.socialAccount);
    const ageHours = (now.getTime() - (t.publishedAt?.getTime() ?? now.getTime())) / 3600 / 1000;
    const m = await adapter.pullPostMetrics(t.socialAccount, t.externalId!, ageHours);
    await prisma.postAnalytics.upsert({
      where: { postTargetId: t.id },
      create: { organizationId: t.organizationId, postTargetId: t.id, ...m },
      update: m,
    });
  }

  // 3. Daily account snapshot (skip accounts that already have one for today).
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const accounts = await prisma.socialAccount.findMany({
    include: { snapshots: { orderBy: { date: "desc" }, take: 1 } },
    take: 200,
  });
  let snapshots = 0;
  for (const account of accounts) {
    const latest = account.snapshots[0];
    if (latest && latest.date.getTime() >= today.getTime()) continue;
    const adapter = getAdapter(account);
    const snap = await adapter.pullAccountSnapshot(account, latest ?? null);
    await prisma.accountAnalyticsSnapshot.upsert({
      where: { socialAccountId_date: { socialAccountId: account.id, date: today } },
      create: {
        organizationId: account.organizationId,
        socialAccountId: account.id,
        date: today,
        ...snap,
      },
      update: {},
    });
    snapshots += 1;
  }

  return NextResponse.json({ published: due.length, metricsRefreshed: published.length, snapshots });
}
