import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryRow, MemoryInsert, MemoryUpdate } from '@/lib/db/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>

// Excludes `embedding` — it's a 768-number vector with no UI use, and including it
// bloats every response by ~10-15KB per memory for no benefit.
const MEMORY_COLUMNS = 'id, user_id, raw_input, ai_summary, type, tags, importance, remind_at, remind_repeat, remind_sent_at, source, is_archived, metadata, created_at, updated_at'

export async function createMemory(db: Db, data: MemoryInsert): Promise<MemoryRow> {
  const { data: memory, error } = await db
    .from('memories')
    .insert(data)
    .select(MEMORY_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return memory as MemoryRow
}

export async function getMemories(
  db: Db,
  userId: string,
  options: {
    type?: MemoryRow['type']
    limit?: number
    offset?: number
    includeArchived?: boolean
  } = {},
): Promise<MemoryRow[]> {
  const { type, limit = 20, offset = 0, includeArchived = false } = options

  let query = db
    .from('memories')
    .select(MEMORY_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('type', type)
  if (!includeArchived) query = query.eq('is_archived', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as MemoryRow[]
}

export async function getMemoryById(db: Db, id: string): Promise<MemoryRow | null> {
  const { data, error } = await db
    .from('memories')
    .select(MEMORY_COLUMNS)
    .eq('id', id)
    .single()

  if (error) return null
  return data as MemoryRow
}

export async function updateMemory(db: Db, id: string, updates: MemoryUpdate): Promise<MemoryRow> {
  const { data, error } = await db
    .from('memories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(MEMORY_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return data as MemoryRow
}

export async function deleteMemory(db: Db, id: string): Promise<void> {
  const { error } = await db.from('memories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getUpcomingReminders(
  db: Db,
  userId: string,
  withinHours: number = 24,
): Promise<MemoryRow[]> {
  const now = new Date()
  const until = new Date(now.getTime() + withinHours * 60 * 60 * 1000)

  const { data, error } = await db
    .from('memories')
    .select(MEMORY_COLUMNS)
    .eq('user_id', userId)
    .not('remind_at', 'is', null)
    .gte('remind_at', now.toISOString())
    .lte('remind_at', until.toISOString())
    .eq('is_archived', false)
    .order('remind_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as MemoryRow[]
}

// Cross-user: every reminder that is due now and has NOT been delivered yet.
// Used only by the cron delivery engine with the service-role client (bypasses RLS).
// remind_sent_at IS NULL is the "fire exactly once" guard; recurring reminders are
// rolled forward (remind_at advanced, remind_sent_at reset) so they re-qualify next cycle.
export async function getAllDueReminders(
  db: Db,
  nowIso: string = new Date().toISOString(),
): Promise<MemoryRow[]> {
  const { data, error } = await db
    .from('memories')
    .select(MEMORY_COLUMNS)
    .not('remind_at', 'is', null)
    .lte('remind_at', nowIso)
    .is('remind_sent_at', null)
    .eq('is_archived', false)
    .order('remind_at', { ascending: true })
    .limit(500)

  if (error) throw new Error(error.message)
  return (data ?? []) as MemoryRow[]
}
