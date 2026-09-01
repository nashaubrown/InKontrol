import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import * as social from "@/lib/repos/social";
import { PLATFORM_LABELS } from "@/lib/social/adapters";
import {
  setPostStatusAction,
  publishNowAction,
  setScheduleAction,
  setOverrideAction,
  deletePostAction,
} from "@/lib/social-actions";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const ctx = await requireOrg(slug);
  const post = await social.getPost(ctx, postId);
  if (!post) notFound();
  const isAdmin = hasAtLeastRole(ctx, "ADMIN");

  return (
    <div className="animate-settle max-w-3xl">
      <p className="text-xs text-secondary">
        <Link href={`/o/${slug}/social/posts`} className="hover:text-primary">
          ← all posts
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        Post · {post.status.toLowerCase().replaceAll("_", " ")}
      </h1>
      <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border-soft bg-surface p-4 text-sm">
        {post.content}
      </p>
      {post.mediaUrl && (
        <p className="mt-2 text-xs text-secondary">
          Media: <span className="break-all">{post.mediaUrl}</span>
        </p>
      )}

      {/* Approval workflow: Draft -> Pending approval -> Scheduled -> Published */}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {post.status === "DRAFT" && (
          <form action={setPostStatusAction.bind(null, slug, postId, "PENDING_APPROVAL")}>
            <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
              Submit for approval
            </button>
          </form>
        )}
        {post.status === "PENDING_APPROVAL" && isAdmin && (
          <>
            <form action={setPostStatusAction.bind(null, slug, postId, "SCHEDULED")}>
              <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
                Approve &amp; schedule
              </button>
            </form>
            <form action={setPostStatusAction.bind(null, slug, postId, "DRAFT")}>
              <button className="rounded-md border border-border-soft bg-surface px-4 py-1.5 hover:border-primary">
                Send back to draft
              </button>
            </form>
          </>
        )}
        {post.status === "PENDING_APPROVAL" && !isAdmin && (
          <p className="text-xs text-secondary">Waiting for an admin to approve.</p>
        )}
        {(post.status === "SCHEDULED" || post.status === "FAILED") && isAdmin && (
          <form action={publishNowAction.bind(null, slug, postId)}>
            <button className="rounded-md bg-primary px-4 py-1.5 font-medium text-white hover:opacity-90">
              Publish now
            </button>
          </form>
        )}
      </div>

      {post.status !== "PUBLISHED" && (
        <form action={setScheduleAction.bind(null, slug, postId)} className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-xs text-secondary">Schedule (UTC)</span>
          <input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={post.targets[0]?.scheduledAt?.toISOString().slice(0, 16) ?? ""}
            className="rounded-md border border-border-soft bg-surface px-2 py-1"
          />
          <button className="rounded-md border border-border-soft bg-surface px-3 py-1 text-xs hover:border-primary">
            Save
          </button>
        </form>
      )}

      <h2 className="mt-8 text-sm font-semibold">Targets</h2>
      <ul className="mt-2 space-y-3">
        {post.targets.map((t) => (
          <li key={t.id} className="rounded-lg border border-border-soft bg-surface p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {PLATFORM_LABELS.find((p) => p.value === t.socialAccount.platform)?.label ??
                  t.socialAccount.platform}{" "}
                @{t.socialAccount.handle}
              </p>
              <span className="text-xs text-secondary">
                {t.status.toLowerCase().replaceAll("_", " ")}
                {t.publishedAt && ` · ${t.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`}
              </span>
            </div>
            {t.errorMessage && <p className="mt-1 text-xs">{t.errorMessage}</p>}
            {t.analytics && (
              <p className="mt-2 text-xs text-secondary" style={{ fontFeatureSettings: '"tnum"' }}>
                {t.analytics.impressions.toLocaleString()} impressions · {t.analytics.likes} likes ·{" "}
                {t.analytics.comments} comments · {t.analytics.shares} shares · {t.analytics.clicks}{" "}
                clicks
              </p>
            )}
            {t.status !== "PUBLISHED" && (
              <form
                action={setOverrideAction.bind(null, slug, postId, t.id)}
                className="mt-2 flex gap-2"
              >
                <input
                  name="contentOverride"
                  defaultValue={t.contentOverride ?? ""}
                  placeholder="Per-platform caption override (optional)"
                  className="w-full rounded-md border border-border-soft px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
                <button className="text-xs text-primary hover:underline">Save</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={deletePostAction.bind(null, slug, postId)} className="mt-8">
        <button className="rounded-md border border-border-soft px-3 py-1.5 text-xs text-secondary hover:bg-error/30 hover:text-ink">
          Delete post
        </button>
      </form>
    </div>
  );
}
