-- Add conversation linking + metadata columns
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS participants JSONB;
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS depth INTEGER;
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS ending_style TEXT;
