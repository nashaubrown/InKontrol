import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as collab from "@/lib/repos/collab";
import type { OrgContext } from "@/lib/tenant";

async function resolveOrg(slug: string): Promise<OrgContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organization: { slug } },
    include: { organization: true },
  });
  if (!membership) return null;
  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    orgSlug: slug,
    orgName: membership.organization.name,
    role: membership.role,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; taskId: string }> }
) {
  const { slug, taskId } = await params;
  const ctx = await resolveOrg(slug);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > collab.MAX_ATTACHMENT_BYTES)
    return NextResponse.json({ error: "File is larger than 4 MB" }, { status: 413 });

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const created = await collab.addAttachment(ctx, taskId, {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      data,
    });
    return NextResponse.json(created);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
