-- Migration: Add channel column to community_posts for dedicated community channels
-- Channels: questions, wins, general, team_interne

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'general';

-- Index for efficient channel filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_channel ON community_posts (channel);

-- Composite index for hidden + channel queries (used by getCommunityPosts and getCommunityChannelCounts)
CREATE INDEX IF NOT EXISTS idx_community_posts_hidden_channel ON community_posts (hidden, channel);

-- Backfill existing posts: map type to channel where sensible
UPDATE community_posts SET channel = 'questions' WHERE type = 'question' AND (channel IS NULL OR channel = 'general');
UPDATE community_posts SET channel = 'wins' WHERE type = 'win' AND (channel IS NULL OR channel = 'general');

-- Ensure all NULL channels default to 'general'
UPDATE community_posts SET channel = 'general' WHERE channel IS NULL;

-- Validate channel values via CHECK constraint (idempotent: drop + create)
-- NOTE: team_interne access is enforced at the application layer (server actions)
-- because RLS cannot easily check the requesting user's role for read queries.
-- The createCommunityPost server action verifies admin/manager/setter role
-- before allowing inserts to team_interne.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_community_posts_channel'
  ) THEN
    ALTER TABLE community_posts ADD CONSTRAINT chk_community_posts_channel
      CHECK (channel IN ('questions', 'wins', 'general', 'team_interne'));
  END IF;
END $$;
