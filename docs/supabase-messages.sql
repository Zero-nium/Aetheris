-- Aetheris — User-Agent Message Storage
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS aetheris_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  tick INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aetheris_messages_agent_session_idx ON aetheris_messages(agent_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aetheris_messages_agent_user_idx ON aetheris_messages(agent_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aetheris_messages_created_idx ON aetheris_messages(created_at DESC);

-- RLS: read-only public (messages are tied to user_id, write via service role)
ALTER TABLE aetheris_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aetheris messages are publicly readable" ON aetheris_messages FOR SELECT USING (true);
