import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { unauthorized, handleApiError } from '@/lib/utils/errors'
import type { EntityRow } from '@/lib/db/types'

const QuerySchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { type, limit } = parsed.data

    let query = db
      .from('entities')
      .select('*')
      .eq('user_id', user.id)
      .order('memory_count', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ entities: (data ?? []) as EntityRow[] })
  } catch (error) {
    return handleApiError(error)
  }
}
