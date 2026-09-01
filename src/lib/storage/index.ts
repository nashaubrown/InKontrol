// Cloud storage import (Phase 1.5). One StorageProvider contract; adapters for
// Google Drive and Dropbox. Tokens are stored AES-encrypted per user+org+provider
// (IntegrationToken), with minimum read-only OAuth scopes.

import { createHmac, timingSafeEqual } from "crypto";
import { prisma, withOrg } from "@/lib/db";
import { encryptJson, decryptJson } from "@/lib/crypto";
import type { OrgContext } from "@/lib/tenant";
import { googleDriveProvider } from "./google-drive";
import { dropboxProvider } from "./dropbox";

export type StorageFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
};

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
};

export interface StorageProvider {
  key: "google_drive" | "dropbox";
  label: string;
  configured(): boolean;
  authUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  refresh?(tokens: TokenSet): Promise<TokenSet>;
  list(tokens: TokenSet, query: string): Promise<StorageFile[]>;
  download(tokens: TokenSet, fileId: string): Promise<{ data: Buffer; contentType: string }>;
  revoke?(tokens: TokenSet): Promise<void>;
}

export const PROVIDERS: Record<string, StorageProvider> = {
  google_drive: googleDriveProvider,
  dropbox: dropboxProvider,
};

// OAuth state is HMAC-signed so the callback can trust the org slug it carries.
export function signState(payload: string): string {
  const mac = createHmac("sha256", process.env.SECRETS_KEY ?? "dev").update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function verifyState(state: string): string | null {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const payload = Buffer.from(body, "base64url").toString();
  const expected = createHmac("sha256", process.env.SECRETS_KEY ?? "dev").update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

export async function saveTokens(ctx: OrgContext, provider: string, tokens: TokenSet) {
  await withOrg(ctx.organizationId, (tx) =>
    tx.integrationToken.upsert({
      where: {
        userId_organizationId_provider: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          provider,
        },
      },
      create: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        provider,
        encryptedData: encryptJson(tokens),
      },
      update: { encryptedData: encryptJson(tokens) },
    })
  );
}

export async function getTokens(ctx: OrgContext, provider: string): Promise<TokenSet | null> {
  const row = await withOrg(ctx.organizationId, (tx) =>
    tx.integrationToken.findFirst({
      where: { userId: ctx.userId, organizationId: ctx.organizationId, provider },
    })
  );
  if (!row) return null;
  let tokens = decryptJson<TokenSet>(row.encryptedData);
  const p = PROVIDERS[provider];
  if (p?.refresh && tokens.expiresAt && tokens.expiresAt < Date.now() + 60_000) {
    tokens = await p.refresh(tokens);
    await saveTokens(ctx, provider, tokens);
  }
  return tokens;
}

/** Disconnect: revoke with the provider (not just locally), then delete the row. */
export async function disconnect(ctx: OrgContext, provider: string) {
  const tokens = await getTokens(ctx, provider);
  const p = PROVIDERS[provider];
  if (tokens && p?.revoke) await p.revoke(tokens).catch(() => {});
  await prisma.integrationToken.deleteMany({
    where: { userId: ctx.userId, organizationId: ctx.organizationId, provider },
  });
}
