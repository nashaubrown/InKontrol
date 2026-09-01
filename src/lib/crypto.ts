// Application-level encryption for third-party OAuth tokens (security brief §3).
// AES-256-GCM with a key from the environment (never stored in the database).
// Set SECRETS_KEY to 32 bytes base64: openssl rand -base64 32

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function key(): Buffer {
  const raw = process.env.SECRETS_KEY;
  if (!raw) throw new Error("SECRETS_KEY is not set — required for storing integration tokens");
  // Accept any string; derive a stable 32-byte key
  return createHash("sha256").update(raw).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptJson<T = unknown>(ciphertext: string): T {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
