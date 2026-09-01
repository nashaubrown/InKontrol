// WhatsApp channel via the Meta Cloud API. Activates when WHATSAPP_TOKEN and
// WHATSAPP_PHONE_NUMBER_ID are set, and requires a Meta-approved message
// template named by WHATSAPP_TEMPLATE (Meta Business verification takes days —
// start it early). Until then this is a silent no-op. Recipients also need a
// phone number on file, which the current User model doesn't store yet; wire
// that in when the Meta side is approved.

export async function sendWhatsApp(_recipientKey: string, _title: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;
  // Intentionally inert until per-user phone numbers + an approved template exist.
  return;
}
