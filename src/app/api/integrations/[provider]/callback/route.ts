import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROVIDERS, verifyState, saveTokens } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const p = PROVIDERS[provider];
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state") ?? "";
  const payload = verifyState(stateRaw);
  if (!p || !code || !payload) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  }
  const { orgSlug, t } = JSON.parse(payload) as { orgSlug: string; t: number };
  if (Date.now() - t > 15 * 60 * 1000) {
    return NextResponse.json({ error: "State expired, retry connecting" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/sign-in", req.url));
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organization: { slug: orgSlug } },
    include: { organization: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base = process.env.APP_URL ?? req.nextUrl.origin;
  try {
    const tokens = await p.exchangeCode(code, `${base}/api/integrations/${provider}/callback`);
    await saveTokens(
      {
        userId: session.user.id,
        organizationId: membership.organizationId,
        orgSlug,
        orgName: membership.organization.name,
        role: membership.role,
        guestSpaceIds: null,
        onboarded: true,
      },
      provider,
      tokens
    );
  } catch (err) {
    console.error("oauth callback failed", err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${base}/o/${orgSlug}/settings?connected=error`);
  }
  return NextResponse.redirect(`${base}/o/${orgSlug}/settings?connected=${provider}`);
}
