import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationRow, PushSubscriptionRow, Json } from '@/lib/db/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>

const NOTIFICATION_COLUMNS = 'id, user_id, memory_id, title, body, type, url, channels, read_at, created_at'

export async function createNotification(
  db: Db,
  data: {
    user_id: string
    title: string
    body?: string | null
    memory_id?: string | null
    type?: NotificationRow['type']
    url?: string | null
    channels?: Json
  },
): Promise<NotificationRow> {
  const { data: row, error } = await db
    .from('notifications')
    .insert(data)
    .select(NOTIFICATION_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return row as NotificationRow
}

export async function getNotifications(
  db: Db,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationRow[]> {
  const { unreadOnly = false, limit = 20 } = options

  let query = db
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.is('read_at', null)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as NotificationRow[]
}

export async function getUnreadNotificationCount(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markNotificationRead(db: Db, id: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(db: Db, userId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

// --- Push subscriptions ---

export async function upsertPushSubscription(
  db: Db,
  data: {
    user_id: string
    endpoint: string
    p256dh: string
    auth: string
    user_agent?: string | null
  },
): Promise<void> {
  const { error } = await db
    .from('push_subscriptions')
    .upsert(
      { ...data, last_used_at: new Date().toISOString() },
      { onConflict: 'user_id,endpoint' },
    )
  if (error) throw new Error(error.message)
}

export async function deletePushSubscriptionByEndpoint(
  db: Db,
  userId: string,
  endpoint: string,
): Promise<void> {
  const { error } = await db
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}

export async function getPushSubscriptions(db: Db, userId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []) as PushSubscriptionRow[]
}

// Cron prunes a dead device (push service returned 404/410) by its row id.
export async function deletePushSubscriptionById(db: Db, id: string): Promise<void> {
  const { error } = await db.from('push_subscriptions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
