// Telegram channel — scaffolded and wired into the dispatcher, but inert until the
// Tier-1 Telegram capture feature lands. To finish it later:
//   1. Set TELEGRAM_BOT_TOKEN (from @BotFather).
//   2. Store each user's chat id (e.g. profiles.preferences.telegram_chat_id) when they
//      link their account via the bot.
//   3. The dispatcher already calls sendTelegram() when both are present.

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch (err) {
    console.error('Telegram send error:', err)
    return false
  }
}
