-- Add dialogue enrichment columns to aetheris_interactions
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS dialogue_status TEXT DEFAULT 'pending';
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS enriched_dialogue TEXT;
ALTER TABLE aetheris_interactions ADD COLUMN IF NOT EXISTS enriched_response TEXT;
