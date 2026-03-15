-- Migration: Add channel column to community_posts for dedicated community channels
-- Channels: questions, wins, general, team_interne

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'general';

-- Index for efficient channel filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_channel ON community_posts (channel);

-- Backfill existing posts: map type to channel where sensible
UPDATE community_posts SET channel = 'questions' WHERE type = 'question' AND (channel IS NULL OR channel = 'general');
UPDATE community_posts SET channel = 'wins' WHERE type = 'win' AND (channel IS NULL OR channel = 'general');
