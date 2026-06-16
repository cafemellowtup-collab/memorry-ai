import { embed } from 'ai'
import { models } from '@/lib/ai/client'

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: models.embed,
    value: text,
    providerOptions: {
      google: { outputDimensionality: 768 },
    },
  })
  return embedding
}
