// Telegram channel via Bot API. Activates when TELEGRAM_BOT_TOKEN is set
// (create a bot with @BotFather). Users link their account from the
// notification settings page: they message the bot their personal link code,
// and the /api/telegram/webhook route stores their chat id.

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
    });
  } catch (err) {
    console.error("telegram send failed", err instanceof Error ? err.message : err);
  }
}
