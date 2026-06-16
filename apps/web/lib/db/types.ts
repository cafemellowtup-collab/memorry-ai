export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MemoryType = 'note' | 'reminder' | 'person' | 'habit' | 'decision' | 'insight'
export type MemorySource = 'chat' | 'voice' | 'telegram' | 'whatsapp' | 'import'
export type RemindRepeat = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type EntityType = 'person' | 'place' | 'project' | 'habit' | 'topic'

export interface MemoryRow {
  id: string
  user_id: string
  raw_input: string
  ai_summary: string | null
  type: MemoryType
  tags: string[]
  importance: number
  remind_at: string | null
  remind_repeat: RemindRepeat | null
  remind_sent_at: string | null
  source: MemorySource
  is_archived: boolean
  metadata: Json
  created_at: string
  updated_at: string
}

export interface MemoryInsert {
  id?: string
  user_id: string
  raw_input: string
  ai_summary?: string | null
  embedding?: string | null
  type?: MemoryType
  tags?: string[]
  importance?: number
  remind_at?: string | null
  remind_repeat?: RemindRepeat | null
  remind_sent_at?: string | null
  source?: MemorySource
  is_archived?: boolean
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface MemoryUpdate {
  ai_summary?: string | null
  type?: MemoryType
  tags?: string[]
  importance?: number
  remind_at?: string | null
  remind_repeat?: RemindRepeat | null
  remind_sent_at?: string | null
  is_archived?: boolean
  metadata?: Json
  updated_at?: string
}

export interface EntityRow {
  id: string
  user_id: string
  name: string
  type: EntityType
  description: string | null
  attributes: Json
  memory_count: number
  last_referenced: string | null
  created_at: string
}

export interface ProfileRow {
  id: string
  display_name: string | null
  timezone: string
  preferences: Json
  ai_token_usage_today: number
  ai_token_reset_at: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string
          preferences?: Json
          ai_token_usage_today?: number
          ai_token_reset_at?: string
          created_at?: string
        }
        Update: {
          display_name?: string | null
          timezone?: string
          preferences?: Json
          ai_token_usage_today?: number
          ai_token_reset_at?: string
        }
        Relationships: []
      }
      memories: {
        Row: MemoryRow
        Insert: MemoryInsert
        Update: MemoryUpdate
        Relationships: []
      }
      entities: {
        Row: EntityRow
        Insert: {
          id?: string
          user_id: string
          name: string
          type: EntityType
          description?: string | null
          attributes?: Json
          memory_count?: number
          last_referenced?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          type?: EntityType
          description?: string | null
          attributes?: Json
          memory_count?: number
          last_referenced?: string | null
        }
        Relationships: []
      }
      entity_memory_links: {
        Row: {
          entity_id: string
          memory_id: string
          context: string | null
        }
        Insert: {
          entity_id: string
          memory_id: string
          context?: string | null
        }
        Update: {
          context?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          messages: Json
          context_summary: string | null
          created_at: string
          last_activity_at: string
        }
        Insert: {
          id?: string
          user_id: string
          messages?: Json
          context_summary?: string | null
          created_at?: string
          last_activity_at?: string
        }
        Update: {
          messages?: Json
          context_summary?: string | null
          last_activity_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
