import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as collab from "@/lib/repos/collab";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; attachmentId: string }> }
) {
  const { slug, attachmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organization: { slug } },
    include: { organization: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachment = await collab.getAttachmentData(
    {
      userId: session.user.id,
      organizationId: membership.organizationId,
      orgSlug: slug,
      orgName: membership.organization.name,
      role: membership.role,
      guestSpaceIds: null,
      onboarded: true,
    },
    attachmentId
  );
  if (!attachment?.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(attachment.data), {
    headers: {
      "Content-Type": attachment.contentType,
      // Force download; never render user uploads inline on the app origin (stored-XSS guard)
      "Content-Disposition": `attachment; filename="${attachment.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0",
    },
  });
}
