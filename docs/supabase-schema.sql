-- Aetheris — Simulation Persistence Schema
-- Run in Supabase SQL Editor

-- Events log (all simulation events)
CREATE TABLE IF NOT EXISTS aetheris_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick INTEGER NOT NULL,
  type TEXT NOT NULL,            -- agent_action, agent_move, agent_interaction, world_event, world_expansion, ambient
  content TEXT NOT NULL,
  agent_name TEXT,              -- which agent(s) involved
  space_id TEXT,                -- which space
  image_url TEXT,               -- generated image URL (if applicable)
  image_prompt TEXT,            -- prompt used for image (if applicable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aetheris_events_tick_idx ON aetheris_events(tick DESC);
CREATE INDEX IF NOT EXISTS aetheris_events_type_idx ON aetheris_events(type);
CREATE INDEX IF NOT EXISTS aetheris_events_created_idx ON aetheris_events(created_at DESC);

-- Agent interactions (conversations between agents)
CREATE TABLE IF NOT EXISTS aetheris_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick INTEGER NOT NULL,
  agent_a TEXT NOT NULL,         -- initiator
  agent_b TEXT NOT NULL,         -- recipient
  interaction_type TEXT NOT NULL, -- observation, question, playful_comment, quiet_acknowledgment, etc.
  agent_a_space TEXT,            -- where it happened
  agent_b_space TEXT,
  content TEXT NOT NULL,
  affinity FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aetheris_interactions_tick_idx ON aetheris_interactions(tick DESC);
CREATE INDEX IF NOT EXISTS aetheris_interactions_agents_idx ON aetheris_interactions(agent_a, agent_b);

-- Agent state snapshots (periodic saves of agent positions, moods, relationships)
CREATE TABLE IF NOT EXISTS aetheris_agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  tick INTEGER NOT NULL,
  space_id TEXT,
  action TEXT,
  mood TEXT,
  job TEXT,
  personality TEXT,
  known_agents TEXT[],           -- array of agent names they've met
  discovered_spaces TEXT[],      -- array of space IDs they've visited
  conversations_had INTEGER DEFAULT 0,
  affinity_map JSONB,            -- { "agentName": affinity_score }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aetheris_agent_states_agent_idx ON aetheris_agent_states(agent_id, tick DESC);

-- World state snapshots (spaces, connections, items)
CREATE TABLE IF NOT EXISTS aetheris_world_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick INTEGER NOT NULL,
  spaces JSONB NOT NULL,         -- full spaces array
  resonance JSONB NOT NULL,     -- resonance state
  agent_count INTEGER NOT NULL,
  space_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aetheris_world_states_tick_idx ON aetheris_world_states(tick DESC);

-- RLS (read-only public, write via service role)
ALTER TABLE aetheris_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aetheris_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aetheris_agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE aetheris_world_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aetheris events are publicly readable" ON aetheris_events FOR SELECT USING (true);
CREATE POLICY "Aetheris interactions are publicly readable" ON aetheris_interactions FOR SELECT USING (true);
CREATE POLICY "Aetheris agent states are publicly readable" ON aetheris_agent_states FOR SELECT USING (true);
CREATE POLICY "Aetheris world states are publicly readable" ON aetheris_world_states FOR SELECT USING (true);
