import type { StorageProvider, TokenSet, StorageFile } from "./index";

// Dropbox adapter — files.content.read scope only.

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Dropbox token exchange failed (${res.status})`);
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

export const dropboxProvider: StorageProvider = {
  key: "dropbox",
  label: "Dropbox",
  configured: () => Boolean(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET),
  authUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.DROPBOX_APP_KEY!,
      redirect_uri: redirectUri,
      response_type: "code",
      token_access_type: "offline",
      state,
    });
    return `https://www.dropbox.com/oauth2/authorize?${params}`;
  },
  async exchangeCode(code, redirectUri) {
    return tokenRequest({
      code,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
  },
  async refresh(tokens) {
    if (!tokens.refreshToken) return tokens;
    const next = await tokenRequest({
      refresh_token: tokens.refreshToken,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
      grant_type: "refresh_token",
    });
    return { ...next, refreshToken: tokens.refreshToken };
  },
  async list(tokens, query) {
    const res = query
      ? await fetch("https://api.dropboxapi.com/2/files/search_v2", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, options: { max_results: 25, filename_only: true } }),
        })
      : await fetch("https://api.dropboxapi.com/2/files/list_folder", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: "", limit: 25 }),
        });
    if (!res.ok) throw new Error(`Dropbox list failed (${res.status})`);
    const json = (await res.json()) as Record<string, unknown>;
    type Entry = { ".tag": string; id: string; name: string; size?: number };
    const entries: Entry[] = query
      ? ((json.matches as { metadata: { metadata: Entry } }[]) ?? []).map((m) => m.metadata.metadata)
      : ((json.entries as Entry[]) ?? []);
    return entries
      .filter((e) => e[".tag"] === "file")
      .map<StorageFile>((e) => ({
        id: e.id,
        name: e.name,
        mimeType: "application/octet-stream",
        size: e.size ?? null,
      }));
  },
  async download(tokens, fileId) {
    const res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: fileId }),
      },
    });
    if (!res.ok) throw new Error(`Dropbox download failed (${res.status})`);
    return {
      data: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  },
  async revoke(tokens) {
    await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  },
};
