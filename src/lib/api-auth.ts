// Public API key auth (Phase 5.2). Keys look like ik_<random>; only the SHA-256
// hash is stored, keys are scoped (read / read_write) and revocable.

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export function generateApiKey() {
  const raw = `ik_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: createHash("sha256").update(raw).digest("hex"), prefix: raw.slice(0, 8) };
}

export type ApiAuthResult =
  | { ok: true; organizationId: string; scope: string; keyId: string }
  | { ok: false; status: number; error: string };

export async function authenticateApiRequest(
  authorization: string | null,
  needsWrite = false
): Promise<ApiAuthResult> {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !token.startsWith("ik_")) {
    return { ok: false, status: 401, error: "Missing or malformed API key" };
  }
  const hash = createHash("sha256").update(token).digest("hex");
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key || key.revokedAt) return { ok: false, status: 401, error: "Invalid or revoked API key" };
  if (needsWrite && key.scope !== "read_write") {
    return { ok: false, status: 403, error: "This key is read-only" };
  }
  if (!checkRateLimit(`api:${key.id}`, 120, 60_000)) {
    return { ok: false, status: 429, error: "Rate limit exceeded (120 req/min)" };
  }
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return { ok: true, organizationId: key.organizationId, scope: key.scope, keyId: key.id };
}
