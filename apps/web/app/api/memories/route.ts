import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { createMemory, getMemories } from '@/lib/db/queries/memories'
import { CreateMemorySchema } from '@/lib/validation/schemas'
import { extractMemoryFromInput } from '@/lib/ai/memory-extraction'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { handleApiError, unauthorized, rateLimited } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') as any
    const limit = Number(searchParams.get('limit') ?? '20')
    const offset = Number(searchParams.get('offset') ?? '0')

    const memories = await getMemories(db, user.id, { type, limit, offset })
    return NextResponse.json({ memories })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const { success } = await checkRateLimit(`memories:${user.id}`)
    if (!success) return rateLimited()

    const body = await request.json()
    const parsed = CreateMemorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { raw_input, source } = parsed.data

    const extracted = await extractMemoryFromInput(raw_input)

    if (!extracted.should_store) {
      return NextResponse.json({ stored: false, message: 'No memory to store' })
    }

    const embedding = await generateEmbedding(extracted.summary)

    const memory = await createMemory(db, {
      user_id: user.id,
      raw_input,
      ai_summary: extracted.summary,
      type: extracted.type,
      tags: extracted.tags,
      importance: extracted.importance,
      remind_at: extracted.remind_at,
      remind_repeat: extracted.remind_repeat,
      source,
      metadata: { entities: extracted.entities, embedding_model: 'text-embedding-004' },
    })

    return NextResponse.json({ stored: true, memory }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
