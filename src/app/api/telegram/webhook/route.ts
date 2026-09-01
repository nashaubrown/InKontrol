import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendTelegram } from "@/lib/notify/telegram";

// Telegram webhook (set it with:
//   curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=$APP_URL/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET")
// Validated via Telegram's secret-token header, per security brief §4.

const updateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
      text: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  const msg = parsed.success ? parsed.data.message : undefined;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const code = msg.text.trim().replace(/^\/start\s*/i, "").trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(code)) return NextResponse.json({ ok: true });

  const link = await prisma.telegramLink.findUnique({ where: { linkCode: code } });
  if (link) {
    await prisma.telegramLink.update({
      where: { id: link.id },
      data: { chatId: String(msg.chat.id) },
    });
    await sendTelegram(String(msg.chat.id), "Your Telegram is now linked to InKontrol. You'll get notifications here.");
  }
  return NextResponse.json({ ok: true });
}
