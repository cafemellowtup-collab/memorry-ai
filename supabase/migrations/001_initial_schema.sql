-- MemoryAI Initial Schema
-- Migration 001: Core tables with RLS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  timezone text NOT NULL DEFAULT 'UTC',
  preferences jsonb NOT NULL DEFAULT '{}',
  ai_token_usage_today integer NOT NULL DEFAULT 0,
  ai_token_reset_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Core memory store
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  raw_input text NOT NULL CHECK (char_length(raw_input) <= 10000),
  ai_summary text CHECK (char_length(ai_summary) <= 2000),
  embedding vector(768),
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'reminder', 'person', 'habit', 'decision', 'insight')),
  tags text[] NOT NULL DEFAULT '{}',
  importance integer NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  remind_at timestamptz,
  remind_repeat text CHECK (remind_repeat IN ('daily', 'weekly', 'monthly', 'yearly')),
  remind_sent_at timestamptz,
  source text NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'voice', 'telegram', 'whatsapp', 'import')),
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Knowledge graph: people, places, projects, habits
CREATE TABLE entities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 200),
  type text NOT NULL CHECK (type IN ('person', 'place', 'project', 'habit', 'topic')),
  description text,
  attributes jsonb NOT NULL DEFAULT '{}',
  memory_count integer NOT NULL DEFAULT 0,
  last_referenced timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Entity <> Memory links
CREATE TABLE entity_memory_links (
  entity_id uuid NOT NULL REFERENCES entities ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES memories ON DELETE CASCADE,
  context text,
  PRIMARY KEY (entity_id, memory_id)
);

-- Conversation sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]',
  context_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_memories_user_created ON memories (user_id, created_at DESC);
CREATE INDEX idx_memories_user_type ON memories (user_id, type);
CREATE INDEX idx_memories_remind_at ON memories (user_id, remind_at) WHERE remind_at IS NOT NULL AND is_archived = false;
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_entities_user_type ON entities (user_id, type);
CREATE INDEX idx_entity_memory_links_memory ON entity_memory_links (memory_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users own their data
CREATE POLICY "users_own_profiles"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_own_memories"
  ON memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_entities"
  ON entities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_entity_links"
  ON entity_memory_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = entity_memory_links.memory_id
      AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY "users_own_sessions"
  ON sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_audit"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Semantic search function (matches by vector similarity)
CREATE OR REPLACE FUNCTION search_memories(
  p_user_id uuid,
  p_embedding vector(768),
  p_limit integer DEFAULT 10,
  p_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  ai_summary text,
  type text,
  tags text[],
  created_at timestamptz,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.ai_summary,
    m.type,
    m.tags,
    m.created_at,
    1 - (m.embedding <=> p_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.is_archived = false
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_embedding) > p_threshold
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
