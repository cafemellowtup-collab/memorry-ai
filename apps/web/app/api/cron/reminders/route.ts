import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseService } from '@/lib/db/supabase-server'
import { getAllDueReminders, updateMemory } from '@/lib/db/queries/memories'
import { deliverReminder, type ReminderRecipient } from '@/lib/notifications/dispatch'
import { nextOccurrence } from '@/lib/utils/recurrence'

// Cron job: deliver every due reminder, then roll recurring ones forward.
// Triggered by Vercel Cron (GET) or Supabase pg_cron (POST). Authenticated by a
// shared bearer secret so the public route can't be abused to spam notifications.
async function runReminderDelivery(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseService()
  const now = new Date()
  const due = await getAllDueReminders(db, now.toISOString())

  // Resolve each user's contact details once, not per reminder.
  const recipients = new Map<string, ReminderRecipient>()
  async function resolveRecipient(userId: string): Promise<ReminderRecipient> {
    const cached = recipients.get(userId)
    if (cached) return cached

    const { data: authData } = await db.auth.admin.getUserById(userId)
    const { data: profile } = await db
      .from('profiles')
      .select('display_name, preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = (profile?.preferences ?? {}) as { telegram_chat_id?: string }
    const recipient: ReminderRecipient = {
      userId,
      email: authData?.user?.email ?? null,
      displayName: profile?.display_name ?? null,
      telegramChatId: prefs.telegram_chat_id ?? null,
    }
    recipients.set(userId, recipient)
    return recipient
  }

  let delivered = 0
  let failed = 0

  for (const reminder of due) {
    try {
      const recipient = await resolveRecipient(reminder.user_id)
      await deliverReminder(db, reminder, recipient)

      if (reminder.remind_repeat) {
        // Recurring: advance to the next future slot and re-arm (sent stays null so it fires again).
        await updateMemory(db, reminder.id, {
          remind_at: nextOccurrence(reminder.remind_at!, reminder.remind_repeat, now),
          remind_sent_at: null,
        })
      } else {
        // One-time: stamp as sent so it never fires again.
        await updateMemory(db, reminder.id, { remind_sent_at: now.toISOString() })
      }
      delivered++
    } catch (err) {
      console.error(`reminder ${reminder.id} delivery failed:`, err)
      failed++
    }
  }

  return NextResponse.json({ processed: due.length, delivered, failed })
}

export async function GET(request: NextRequest) {
  return runReminderDelivery(request)
}

export async function POST(request: NextRequest) {
  return runReminderDelivery(request)
}
