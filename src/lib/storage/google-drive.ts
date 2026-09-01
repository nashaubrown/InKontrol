import type { StorageProvider, TokenSet, StorageFile } from "./index";

// Google Drive adapter — read-only scope (minimum needed for import).

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  };
}

export const googleDriveProvider: StorageProvider = {
  key: "google_drive",
  label: "Google Drive",
  configured: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  authUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },
  async exchangeCode(code, redirectUri) {
    return tokenRequest({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
  },
  async refresh(tokens) {
    if (!tokens.refreshToken) return tokens;
    const next = await tokenRequest({
      refresh_token: tokens.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    });
    return { ...next, refreshToken: tokens.refreshToken };
  },
  async list(tokens, query) {
    const q = query
      ? `name contains '${query.replace(/['\\]/g, "")}' and trashed = false`
      : "trashed = false";
    const params = new URLSearchParams({
      q,
      pageSize: "25",
      fields: "files(id,name,mimeType,size)",
      orderBy: "modifiedTime desc",
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
    const json = (await res.json()) as {
      files: { id: string; name: string; mimeType: string; size?: string }[];
    };
    return json.files
      .filter((f) => !f.mimeType.startsWith("application/vnd.google-apps"))
      .map<StorageFile>((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? Number(f.size) : null,
      }));
  },
  async download(tokens, fileId) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );
    if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
    return {
      data: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  },
  async revoke(tokens) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokens.accessToken)}`,
      { method: "POST" }
    );
  },
};
