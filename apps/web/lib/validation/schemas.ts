import { z } from 'zod'

export const MemoryTypeSchema = z.enum(['note', 'reminder', 'person', 'habit', 'decision', 'insight'])
export type MemoryType = z.infer<typeof MemoryTypeSchema>

export const CreateMemorySchema = z.object({
  raw_input: z.string().min(1).max(10000),
  source: z.enum(['chat', 'voice', 'telegram', 'whatsapp', 'import']).default('chat'),
})
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>

export const UpdateMemorySchema = z.object({
  ai_summary: z.string().max(2000).optional(),
  type: MemoryTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  remind_at: z.string().datetime().nullable().optional(),
  remind_repeat: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
  is_archived: z.boolean().optional(),
})
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>

export const SearchSchema = z.object({
  q: z.string().min(1).max(500),
  type: MemoryTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})
export type SearchInput = z.infer<typeof SearchSchema>

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  session_id: z.string().uuid().optional(),
})
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>

export const EntityTypeSchema = z.enum(['person', 'place', 'project', 'habit', 'topic'])
export type EntityType = z.infer<typeof EntityTypeSchema>

export const ExtractedEntitySchema = z.object({
  name: z.string(),
  type: EntityTypeSchema,
})
export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>

export const ExtractedMemorySchema = z.object({
  summary: z.string(),
  type: MemoryTypeSchema,
  tags: z.array(z.string()),
  entities: z.array(ExtractedEntitySchema),
  remind_at: z.string().datetime().nullable(),
  remind_repeat: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable(),
  importance: z.number().int().min(1).max(5),
  should_store: z.boolean(),
  supersedes_summaries: z.array(z.string()),
})
export type ExtractedMemory = z.infer<typeof ExtractedMemorySchema>
