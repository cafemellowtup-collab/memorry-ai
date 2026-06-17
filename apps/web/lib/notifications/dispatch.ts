import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryRow } from '@/lib/db/types'
import {
  createNotification,
  getPushSubscriptions,
  deletePushSubscriptionById,
} from '@/lib/db/queries/notifications'
import { sendWebPush } from '@/lib/notifications/web-push'
import { sendEmail } from '@/lib/notifications/email'
import { sendTelegram } from '@/lib/notifications/telegram'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>

export type ReminderRecipient = {
  userId: string
  email: string | null
  displayName: string | null
  telegramChatId: string | null
}

// What actually went out, recorded on the notification row for transparency/debugging.
export type DeliveryChannels = {
  inapp: boolean
  webpush: number
  email: boolean
  telegram: boolean
}

const REMINDER_URL = '/reminders'

/**
 * Fan a single due reminder out across every enabled channel, then write the durable
 * in-app notification record. Each external channel is best-effort and isolated: a
 * failure in one never blocks the others or the in-app record.
 */
export async function deliverReminder(
  db: Db,
  reminder: MemoryRow,
  recipient: ReminderRecipient,
): Promise<DeliveryChannels> {
  const title = 'Reminder'
  const body = (reminder.ai_summary || reminder.raw_input).slice(0, 1000)
  const channels: DeliveryChannels = { inapp: false, webpush: 0, email: false, telegram: false }

  // 1. Web Push to every registered device; prune any device the push service reports gone.
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      const subs = await getPushSubscriptions(db, recipient.userId)
      for (const sub of subs) {
        const res = await sendWebPush(sub, {
          title,
          body,
          url: REMINDER_URL,
          tag: `reminder-${reminder.id}`,
        })
        if (res.ok) channels.webpush++
        else if (res.gone) await deletePushSubscriptionById(db, sub.id)
      }
    } catch (err) {
      console.error('web push fan-out failed:', err)
    }
  }

  // 2. Email (ready; off until RESEND_* set).
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && recipient.email) {
    const greeting = recipient.displayName ? `Hi ${recipient.displayName},` : 'Hi,'
    const safeBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    channels.email = await sendEmail(
      recipient.email,
      `⏰ Reminder: ${body.slice(0, 60)}`,
      `<p>${greeting}</p><p>You asked MemoryAI to remind you:</p><blockquote>${safeBody}</blockquote>`,
    )
  }

  // 3. Telegram (scaffolded; off until token + linked chat id).
  if (process.env.TELEGRAM_BOT_TOKEN && recipient.telegramChatId) {
    channels.telegram = await sendTelegram(recipient.telegramChatId, `⏰ ${title}\n${body}`)
  }

  // 4. In-app feed: the durable record, always written even if it's the only channel.
  channels.inapp = true
  await createNotification(db, {
    user_id: recipient.userId,
    memory_id: reminder.id,
    title,
    body,
    type: 'reminder',
    url: REMINDER_URL,
    channels,
  })

  return channels
}
