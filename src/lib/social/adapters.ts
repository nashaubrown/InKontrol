// SocialPlatformAdapter (Phase 2): one contract per platform so each platform's
// quirks stay isolated. Real platform adapters activate as their developer-app
// approvals land; the demo adapter simulates the full publish/analytics loop so
// the product is testable end-to-end today.

import type { SocialAccount, SocialPlatform } from "@prisma/client";

export interface PublishResult {
  externalId: string;
}

export interface SocialPlatformAdapter {
  platform: SocialPlatform;
  label: string;
  configured(): boolean;
  publish(account: SocialAccount, content: string, mediaUrl?: string | null): Promise<PublishResult>;
  /** Simulated or pulled post metrics, called by the analytics cron. */
  pullPostMetrics(
    account: SocialAccount,
    externalId: string,
    ageHours: number
  ): Promise<{ impressions: number; likes: number; comments: number; shares: number; clicks: number }>;
  /** Daily account-level snapshot. */
  pullAccountSnapshot(
    account: SocialAccount,
    previous: { followers: number } | null
  ): Promise<{ followers: number; engagementRate: number; reach: number; impressions: number }>;
}

// Deterministic pseudo-random from a string seed, so demo numbers look stable.
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const demoAdapter: SocialPlatformAdapter = {
  platform: "DEMO",
  label: "Demo",
  configured: () => true,
  async publish(account) {
    return { externalId: `demo_${account.id.slice(-6)}_${Date.now().toString(36)}` };
  },
  async pullPostMetrics(account, externalId, ageHours) {
    const rand = seeded(externalId);
    const base = 500 + Math.floor(rand() * 4500);
    const growth = Math.min(1, ageHours / 48); // metrics ramp over ~2 days
    const impressions = Math.floor(base * 10 * growth);
    return {
      impressions,
      likes: Math.floor(impressions * (0.03 + rand() * 0.05)),
      comments: Math.floor(impressions * (0.002 + rand() * 0.006)),
      shares: Math.floor(impressions * (0.004 + rand() * 0.008)),
      clicks: Math.floor(impressions * (0.01 + rand() * 0.02)),
    };
  },
  async pullAccountSnapshot(account, previous) {
    const rand = seeded(account.id + new Date().toISOString().slice(0, 10));
    const followers = previous
      ? previous.followers + Math.floor(rand() * 40 - 5)
      : 1000 + Math.floor(rand() * 9000);
    return {
      followers: Math.max(0, followers),
      engagementRate: Math.round((1.5 + rand() * 4) * 100) / 100,
      reach: Math.floor(followers * (0.2 + rand() * 0.4)),
      impressions: Math.floor(followers * (0.5 + rand() * 1.2)),
    };
  },
};

// Placeholder for the Meta (Instagram/Facebook) adapter — activates once the
// Meta App Review for content publishing is approved and META_APP_ID/SECRET are
// set. Until then, connect accounts in demo mode.
export const PLATFORM_LABELS: { value: SocialPlatform; label: string }[] = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "X", label: "X" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "GOOGLE_BUSINESS", label: "Google Business" },
];

export function getAdapter(account: { isDemo: boolean; platform: SocialPlatform }): SocialPlatformAdapter {
  // Real adapters get registered here as platform approvals land.
  return demoAdapter;
}
