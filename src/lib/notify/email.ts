// Email channel via Resend's HTTP API. Activates when RESEND_API_KEY is set;
// otherwise a silent no-op so the platform works without an email account.

export async function sendEmail(to: string, subject: string, body: string, linkPath?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.EMAIL_FROM ?? "InKontrol <onboarding@resend.dev>";
  const base = process.env.APP_URL ?? "";
  const link = linkPath ? `${base}${linkPath}` : base;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `InKontrol: ${subject}`,
        text: `${body}\n\n${link}`,
      }),
    });
  } catch (err) {
    console.error("email send failed", err instanceof Error ? err.message : err);
  }
}
