import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryRow, MemoryInsert, MemoryUpdate } from '@/lib/db/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>

export async function createMemory(db: Db, data: MemoryInsert): Promise<MemoryRow> {
  const { data: memory, error } = await db
    .from('memories')
    .insert(data)
    .select()
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
    .select('*')
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
    .select('*')
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
    .select()
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
    .select('*')
    .eq('user_id', userId)
    .not('remind_at', 'is', null)
    .gte('remind_at', now.toISOString())
    .lte('remind_at', until.toISOString())
    .eq('is_archived', false)
    .order('remind_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as MemoryRow[]
}
