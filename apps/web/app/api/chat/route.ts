import { NextRequest, NextResponse } from 'next/server'
import { streamText, isTextUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/db/supabase'
import { createMemory, getMemories } from '@/lib/db/queries/memories'
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

    const { messages } = parsed.data
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    const userText = (lastUserMessage.parts as UIMessage['parts'])
      .filter(isTextUIPart)
      .map(p => p.text)
      .join('')

    if (!userText) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    const extracted = await extractMemoryFromInput(userText)
    let storedMemory = null

    if (extracted.should_store) {
      const _embedding = await generateEmbedding(extracted.summary)
      storedMemory = await createMemory(db, {
        user_id: user.id,
        raw_input: userText,
        ai_summary: extracted.summary,
        type: extracted.type,
        tags: extracted.tags,
        importance: extracted.importance,
        remind_at: extracted.remind_at,
        remind_repeat: extracted.remind_repeat ?? undefined,
        source: 'chat',
        metadata: { entities: extracted.entities },
      })
    }

    const recentMemories = await getMemories(db, user.id, { limit: 5 })
    const recentSummaries = recentMemories
      .filter(m => m.ai_summary)
      .map(m => m.ai_summary!)

    const prompt = buildChatResponsePrompt(
      userText,
      storedMemory
        ? { should_store: true, summary: extracted.summary, type: extracted.type }
        : null,
      recentSummaries,
      '',
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
