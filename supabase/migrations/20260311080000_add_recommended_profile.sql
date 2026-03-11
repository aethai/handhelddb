-- Add recommended_profile column to consensus_ratings
-- This replaces the 3-bucket TDP model (battery_saver/balanced/performance)
-- with a single recommended profile per game-device pair.
ALTER TABLE consensus_ratings ADD COLUMN IF NOT EXISTS recommended_profile jsonb;
