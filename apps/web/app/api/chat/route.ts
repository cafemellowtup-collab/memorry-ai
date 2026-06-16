import { NextRequest, NextResponse } from 'next/server'
import { streamText, isTextUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/db/supabase-server'
import { createMemory, getMemories, updateMemory } from '@/lib/db/queries/memories'
import { upsertEntitiesForMemory } from '@/lib/db/queries/entities'
import { extractMemoryFromInput } from '@/lib/ai/memory-extraction'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { buildChatResponsePrompt } from '@/lib/ai/prompts/extract-memory'
import { models } from '@/lib/ai/client'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { unauthorized, rateLimited, handleApiError } from '@/lib/utils/errors'

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.unknown()),
    id: z.string().optional(),
  })),
  timezone: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const db = await createSupabaseServer()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return unauthorized()

    const { success } = await checkRateLimit(`chat:${user.id}`)
    if (!success) return rateLimited()

    const body = await request.json()
    const parsed = ChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { messages, timezone } = parsed.data
    let validatedTimezone = 'UTC'
    if (timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone })
        validatedTimezone = timezone
      } catch {
        // Invalid IANA timezone string — fall back to UTC
      }
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    const userText = (lastUserMessage.parts as UIMessage['parts'])
      .filter(isTextUIPart)
      .map(p => p.text)
      .join('')

    if (!userText.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    if (userText.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long (max 10,000 characters)' },
        { status: 400 },
      )
    }

    const recentMemories = await getMemories(db, user.id, { limit: 8 })

    const queryEmbedding = await generateEmbedding(userText)
    const { data: relevantRows } = await db.rpc('search_memories', {
      p_user_id: user.id,
      p_embedding: JSON.stringify(queryEmbedding),
      p_limit: 8,
      p_threshold: 0.35,
    })

    type ContextMemory = { id: string; ai_summary: string }
    const contextMemories: ContextMemory[] = []
    const seenIds = new Set<string>()
    for (const m of [...recentMemories, ...(relevantRows ?? [])]) {
      if (!m.ai_summary || seenIds.has(m.id)) continue
      seenIds.add(m.id)
      contextMemories.push({ id: m.id, ai_summary: m.ai_summary })
    }

    const recentSummaries = contextMemories.map(m => m.ai_summary)

    const pastDecisions = await getMemories(db, user.id, { type: 'decision', limit: 6 })
    const pastDecisionSummaries = pastDecisions
      .filter(m => m.ai_summary)
      .map(m => `${m.ai_summary} (${new Date(m.created_at).toLocaleDateString()})`)

    const extracted = await extractMemoryFromInput(userText, '', validatedTimezone, recentSummaries)
    let storedMemory = null
    const archivedSummaries: string[] = []

    if (extracted.should_store) {
      const embedding = await generateEmbedding(extracted.summary)
      storedMemory = await createMemory(db, {
        user_id: user.id,
        raw_input: userText,
        ai_summary: extracted.summary.slice(0, 2000),
        embedding: JSON.stringify(embedding),
        type: extracted.type,
        tags: extracted.tags,
        importance: extracted.importance,
        remind_at: extracted.remind_at,
        remind_repeat: extracted.remind_repeat ?? undefined,
        source: 'chat',
        metadata: { entities: extracted.entities },
      })

      if (extracted.entities.length > 0) {
        await upsertEntitiesForMemory(db, user.id, storedMemory.id, extracted.entities)
      }
    }

    for (const target of extracted.supersedes_summaries) {
      const normalizedTarget = target.trim().toLowerCase()
      const superseded = contextMemories.find(
        m => m.ai_summary.trim().toLowerCase() === normalizedTarget && m.id !== storedMemory?.id,
      )
      if (superseded) {
        await updateMemory(db, superseded.id, { is_archived: true })
        archivedSummaries.push(superseded.ai_summary)
      }
    }

    const prompt = buildChatResponsePrompt(
      userText,
      storedMemory
        ? { should_store: true, summary: extracted.summary, type: extracted.type }
        : null,
      recentSummaries,
      '',
      new Date().toISOString(),
      archivedSummaries,
      pastDecisionSummaries,
    )

    const result = streamText({
      model: models.fast,
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    return handleApiError(error)
  }
}
