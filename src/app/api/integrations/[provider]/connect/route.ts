import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PROVIDERS, signState } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const p = PROVIDERS[provider];
  const orgSlug = req.nextUrl.searchParams.get("org") ?? "";
  if (!p?.configured() || !/^[a-z0-9-]{1,64}$/.test(orgSlug)) {
    return NextResponse.json({ error: "Provider not configured" }, { status: 400 });
  }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/sign-in", req.url));

  const base = process.env.APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${base}/api/integrations/${provider}/callback`;
  const state = signState(JSON.stringify({ orgSlug, t: Date.now() }));
  return NextResponse.redirect(p.authUrl(state, redirectUri));
}
