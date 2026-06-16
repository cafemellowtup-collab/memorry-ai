import { generateObject } from 'ai'
import { z } from 'zod'
import { models } from '@/lib/ai/client'
import { buildExtractMemoryPrompt } from '@/lib/ai/prompts/extract-memory'
import { ExtractedMemorySchema } from '@/lib/validation/schemas'

export async function extractMemoryFromInput(
  input: string,
  userContext: string = '',
  timezone: string = 'UTC',
  recentMemories: string[] = [],
): Promise<z.infer<typeof ExtractedMemorySchema>> {
  const currentTime = new Date().toISOString()
  const prompt = buildExtractMemoryPrompt(input, userContext, currentTime, timezone, recentMemories)

  const { object } = await generateObject({
    model: models.fast,
    schema: ExtractedMemorySchema,
    prompt,
  })

  return object
}
