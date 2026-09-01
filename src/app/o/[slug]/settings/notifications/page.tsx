import { requireOrg } from "@/lib/tenant";
import { withOrg, prisma } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/notify";
import { setPreferenceAction, getTelegramLinkCodeAction } from "@/lib/notify-actions";

const CHANNELS = [
  { key: "IN_APP", label: "In-app" },
  { key: "EMAIL", label: "Email" },
  { key: "TELEGRAM", label: "Telegram" },
  { key: "WHATSAPP", label: "WhatsApp" },
];

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const [prefs, telegramLink] = await Promise.all([
    withOrg(ctx.organizationId, (tx) =>
      tx.notificationPreference.findMany({
        where: { organizationId: ctx.organizationId, userId: ctx.userId },
      })
    ),
    prisma.telegramLink.findUnique({ where: { userId: ctx.userId } }),
  ]);
  const { code, linked } = telegramLink
    ? { code: telegramLink.linkCode, linked: Boolean(telegramLink.chatId) }
    : await getTelegramLinkCodeAction();

  function isEnabled(eventType: string, channel: string) {
    const p = prefs.find((x) => x.eventType === eventType && x.channel === channel);
    if (!p) return channel === "IN_APP" || channel === "EMAIL";
    return p.enabled;
  }

  const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);
  const whatsappConfigured = Boolean(process.env.WHATSAPP_TOKEN);

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Notification settings</h1>
      <p className="mt-1 text-sm text-secondary">
        Choose which channel each event reaches you on. These settings are yours alone.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs text-secondary">
              <th className="px-4 py-2 font-medium">Event</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((e) => (
              <tr key={e.type} className="border-b border-border-soft last:border-0">
                <td className="px-4 py-2">{e.label}</td>
                {CHANNELS.map((c) => {
                  const enabled = isEnabled(e.type, c.key);
                  return (
                    <td key={c.key} className="px-3 py-2">
                      <form action={setPreferenceAction.bind(null, slug, e.type, c.key, !enabled)}>
                        <button
                          className={`h-5 w-9 rounded-full transition-colors ${
                            enabled ? "bg-primary" : "bg-border-soft"
                          }`}
                          aria-label={`${enabled ? "Disable" : "Enable"} ${c.label} for ${e.label}`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-surface transition-transform ${
                              enabled ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded-lg border border-border-soft bg-surface p-4 text-sm">
        <h2 className="font-semibold">Channel status</h2>
        <ul className="mt-2 space-y-1 text-secondary">
          <li>In-app — always on{" "}
            <span className="rounded bg-success/40 px-1.5 text-xs text-ink">active</span>
          </li>
          <li>
            Email —{" "}
            {emailConfigured ? (
              <span className="rounded bg-success/40 px-1.5 text-xs text-ink">active</span>
            ) : (
              <span className="rounded bg-accent-warm/60 px-1.5 text-xs text-ink">
                needs RESEND_API_KEY
              </span>
            )}
          </li>
          <li>
            Telegram —{" "}
            {!telegramConfigured ? (
              <span className="rounded bg-accent-warm/60 px-1.5 text-xs text-ink">
                needs TELEGRAM_BOT_TOKEN
              </span>
            ) : linked ? (
              <span className="rounded bg-success/40 px-1.5 text-xs text-ink">linked</span>
            ) : (
              <>
                <span className="rounded bg-accent-warm/60 px-1.5 text-xs text-ink">not linked</span>{" "}
                — message the bot this code to link your account:{" "}
                <code className="rounded bg-canvas px-1.5 py-0.5">{code}</code>
              </>
            )}
          </li>
          <li>
            WhatsApp —{" "}
            {whatsappConfigured ? (
              <span className="rounded bg-success/40 px-1.5 text-xs text-ink">configured</span>
            ) : (
              <span className="rounded bg-accent-warm/60 px-1.5 text-xs text-ink">
                needs Meta Cloud API setup
              </span>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}
