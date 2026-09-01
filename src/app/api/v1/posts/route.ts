import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

// Public API v1 — social posts (read).

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const posts = await prisma.socialPost.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      targets: {
        select: {
          status: true,
          scheduledAt: true,
          publishedAt: true,
          socialAccount: { select: { platform: true, handle: true } },
          analytics: {
            select: { impressions: true, likes: true, comments: true, shares: true, clicks: true },
          },
        },
      },
    },
  });
  return NextResponse.json({ data: posts });
}
