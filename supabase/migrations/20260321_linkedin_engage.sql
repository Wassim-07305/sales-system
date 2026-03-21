-- ============================================================================
-- LinkedIn Engage Module — Complete Schema
-- Tables: linkedin_feeds, linkedin_feed_profiles, linkedin_feed_posts,
--         linkedin_comment_history, linkedin_ai_comments, linkedin_style_samples,
--         linkedin_sessions, linkedin_rewrite_options, linkedin_recommendations
-- ============================================================================

-- 1. linkedin_feeds — User-created feed collections
CREATE TABLE IF NOT EXISTS linkedin_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_feeds_user_id ON linkedin_feeds(user_id);

-- 2. linkedin_feed_profiles — Profiles tracked within a feed
CREATE TABLE IF NOT EXISTS linkedin_feed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES linkedin_feeds(id) ON DELETE CASCADE,
  linkedin_profile_url TEXT NOT NULL,
  full_name TEXT,
  job_title TEXT,
  photo_url TEXT,
  linkedin_user_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_feed_profiles_feed_id ON linkedin_feed_profiles(feed_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_feed_profiles_unique ON linkedin_feed_profiles(feed_id, linkedin_profile_url);

-- 3. linkedin_feed_posts — Posts scraped from feed profiles
CREATE TABLE IF NOT EXISTS linkedin_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL REFERENCES linkedin_feeds(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES linkedin_feed_profiles(id) ON DELETE CASCADE,
  linkedin_post_id TEXT,
  content_text TEXT,
  post_url TEXT,
  post_image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_feed_id ON linkedin_feed_posts(feed_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_profile_id ON linkedin_feed_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_published_at ON linkedin_feed_posts(published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_feed_posts_unique ON linkedin_feed_posts(feed_id, post_url);

-- 4. linkedin_comment_history — All comments posted by the user
CREATE TABLE IF NOT EXISTS linkedin_comment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES linkedin_feed_posts(id) ON DELETE SET NULL,
  linkedin_post_id TEXT,
  post_url TEXT,
  creator_name TEXT,
  comment_text TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  likes_on_comment INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_comment_history_user_id ON linkedin_comment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_comment_history_posted_at ON linkedin_comment_history(posted_at DESC);

-- 5. linkedin_ai_comments — AI-generated comments (draft state)
CREATE TABLE IF NOT EXISTS linkedin_ai_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES linkedin_feed_posts(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'value', -- value | question | story
  status TEXT NOT NULL DEFAULT 'generated', -- generated | modified | published | ignored
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_ai_comments_post_id ON linkedin_ai_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_ai_comments_user_id ON linkedin_ai_comments(user_id);

-- 6. linkedin_style_samples — User's writing style examples
CREATE TABLE IF NOT EXISTS linkedin_style_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  example_comment TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_style_samples_user_id ON linkedin_style_samples(user_id);

-- 7. linkedin_sessions — Focus session tracking
CREATE TABLE IF NOT EXISTS linkedin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 600,
  comments_posted INTEGER NOT NULL DEFAULT 0,
  feeds_browsed INTEGER NOT NULL DEFAULT 0,
  profiles_engaged INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_user_id ON linkedin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_started_at ON linkedin_sessions(started_at DESC);

-- 8. linkedin_rewrite_options — Custom rewrite presets
CREATE TABLE IF NOT EXISTS linkedin_rewrite_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_rewrite_options_user_id ON linkedin_rewrite_options(user_id);

-- 9. linkedin_recommendations — AI-generated daily profile recommendations
CREATE TABLE IF NOT EXISTS linkedin_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  profile_title TEXT,
  profile_url TEXT,
  profile_photo_url TEXT,
  reason TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_recommendations_user_id ON linkedin_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_recommendations_generated_at ON linkedin_recommendations(generated_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE linkedin_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_feed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_comment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_ai_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_style_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_rewrite_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_recommendations ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin/manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- linkedin_feeds: user CRUD + admin/manager read
CREATE POLICY "feeds_user_crud" ON linkedin_feeds
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "feeds_admin_read" ON linkedin_feeds
  FOR SELECT USING (is_admin_or_manager());

-- linkedin_feed_profiles: user CRUD via feed ownership
CREATE POLICY "feed_profiles_user_crud" ON linkedin_feed_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM linkedin_feeds WHERE id = feed_id AND user_id = auth.uid())
  );
CREATE POLICY "feed_profiles_admin_read" ON linkedin_feed_profiles
  FOR SELECT USING (is_admin_or_manager());

-- linkedin_feed_posts: user read via feed ownership, insert/update for system
CREATE POLICY "feed_posts_user_read" ON linkedin_feed_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM linkedin_feeds WHERE id = feed_id AND user_id = auth.uid())
    OR is_admin_or_manager()
  );
CREATE POLICY "feed_posts_user_insert" ON linkedin_feed_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM linkedin_feeds WHERE id = feed_id AND user_id = auth.uid())
  );

-- linkedin_comment_history: user CRUD + admin read
CREATE POLICY "comment_history_user_crud" ON linkedin_comment_history
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "comment_history_admin_read" ON linkedin_comment_history
  FOR SELECT USING (is_admin_or_manager());

-- linkedin_ai_comments: user CRUD
CREATE POLICY "ai_comments_user_crud" ON linkedin_ai_comments
  FOR ALL USING (user_id = auth.uid());

-- linkedin_style_samples: user CRUD
CREATE POLICY "style_samples_user_crud" ON linkedin_style_samples
  FOR ALL USING (user_id = auth.uid());

-- linkedin_sessions: user CRUD + admin read
CREATE POLICY "sessions_user_crud" ON linkedin_sessions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "sessions_admin_read" ON linkedin_sessions
  FOR SELECT USING (is_admin_or_manager());

-- linkedin_rewrite_options: user CRUD
CREATE POLICY "rewrite_options_user_crud" ON linkedin_rewrite_options
  FOR ALL USING (user_id = auth.uid());

-- linkedin_recommendations: user CRUD
CREATE POLICY "recommendations_user_crud" ON linkedin_recommendations
  FOR ALL USING (user_id = auth.uid());
