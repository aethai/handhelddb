-- Add 'trusted_benchmark' to quality_tier enum for professional benchmark channels
ALTER TYPE quality_tier ADD VALUE IF NOT EXISTS 'trusted_benchmark' BEFORE 'community_confirmed';
