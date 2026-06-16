import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExtractedEntity } from '@/lib/validation/schemas'
import type { EntityRow } from '@/lib/db/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>

export async function upsertEntitiesForMemory(
  db: Db,
  userId: string,
  memoryId: string,
  entities: ExtractedEntity[],
): Promise<void> {
  for (const entity of entities) {
    const name = entity.name.trim()
    if (!name) continue

    const { data: existing } = await db
      .from('entities')
      .select('id, memory_count')
      .eq('user_id', userId)
      .ilike('name', name)
      .maybeSingle()

    let entityId: string

    if (existing) {
      entityId = (existing as EntityRow).id
      await db
        .from('entities')
        .update({
          memory_count: (existing as EntityRow).memory_count + 1,
          last_referenced: new Date().toISOString(),
        })
        .eq('id', entityId)
    } else {
      const { data: created, error } = await db
        .from('entities')
        .insert({
          user_id: userId,
          name,
          type: entity.type,
          memory_count: 1,
          last_referenced: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      entityId = (created as { id: string }).id
    }

    await db.from('entity_memory_links').insert({
      entity_id: entityId,
      memory_id: memoryId,
    })
  }
}
