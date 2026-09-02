import { requireOrg, hasAtLeastRole } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { saveBrandVoiceAction } from "@/lib/ai-actions";
import { AiAssistant } from "@/components/ai-assistant";

export default async function AiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { brandVoice: true },
  });

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">AI content assistant</h1>
      <p className="mt-1 text-sm text-secondary">
        Caption ideas, hashtags, and rewrites that match how your agency writes.
      </p>
      {!aiConfigured() ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-accent-warm bg-accent-warm/20 p-4 text-sm">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-warm/70 text-xs">
            !
          </span>
          <div>
            <p className="font-medium">Not connected yet</p>
            <p className="mt-0.5 text-secondary">
              Add <code className="rounded bg-surface px-1">ANTHROPIC_API_KEY</code> to your Vercel
              environment variables and redeploy to turn on caption suggestions, hashtags, and
              brand-voice rewriting.
            </p>
          </div>
        </div>
      ) : (
        <AiAssistant orgSlug={slug} />
      )}

      {hasAtLeastRole(ctx, "ADMIN") && (
        <section className="mt-8 rounded-lg border border-border-soft bg-surface p-4">
          <h2 className="text-sm font-semibold">Brand voice</h2>
          <p className="mt-1 text-xs text-secondary">
            Describe how this org writes — tone, phrases to use or avoid. Suggestions and rewrites
            follow it, along with your 3 most recent published posts.
          </p>
          <form action={saveBrandVoiceAction.bind(null, slug)} className="mt-2">
            <textarea
              name="brandVoice"
              rows={3}
              defaultValue={org?.brandVoice ?? ""}
              placeholder="e.g. Direct and warm. Short sentences. No emojis, no exclamation marks. Speak to small business owners."
              className="w-full rounded-md border border-border-soft bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            <button className="mt-2 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white hover:opacity-90">
              Save brand voice
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
