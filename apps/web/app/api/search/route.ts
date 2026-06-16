import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { unauthorized, rateLimited, handleApiError } from '@/lib/utils/errors'
import type { MemoryRow } from '@/lib/db/types'

const SearchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.5),
})

export async function GET(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const { success } = await checkRateLimit(`search:${user.id}`)
    if (!success) return rateLimited()

    const { searchParams } = new URL(request.url)
    const parsed = SearchSchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { q, limit, threshold } = parsed.data
    const embedding = await generateEmbedding(q)

    const { data, error } = await db.rpc('search_memories', {
      p_user_id: user.id,
      p_embedding: JSON.stringify(embedding),
      p_limit: limit,
      p_threshold: threshold,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ memories: (data ?? []) as MemoryRow[], query: q })
  } catch (error) {
    return handleApiError(error)
  }
}
