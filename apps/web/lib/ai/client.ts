import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
})

export const models = {
  fast: google('gemini-2.5-flash'),
  smart: google('gemini-2.5-pro'),
  embed: google.embedding('gemini-embedding-001'),
} as const

export type ModelKey = keyof typeof models
