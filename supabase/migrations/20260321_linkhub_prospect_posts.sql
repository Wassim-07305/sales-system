-- ─── LinkHub : table prospect_posts pour le feed d'engagement ───────────────
-- Stocke les posts scrappés des prospects (LinkedIn/Instagram) pour le warming

CREATE TABLE IF NOT EXISTS prospect_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contenu du post
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
  post_url TEXT,
  post_text TEXT,
  post_image_url TEXT,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  author_headline TEXT,
  published_at TIMESTAMPTZ,

  -- Engagement tracking
  engagement_status TEXT NOT NULL DEFAULT 'pending' CHECK (engagement_status IN ('pending', 'commented', 'liked', 'shared', 'skipped')),
  selected_comment TEXT,
  commented_at TIMESTAMPTZ,

  -- Suggestions IA (JSON array of {type, comment})
  ai_suggestions JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_prospect_posts_user_id ON prospect_posts(user_id);
CREATE INDEX idx_prospect_posts_platform ON prospect_posts(platform);
CREATE INDEX idx_prospect_posts_engagement ON prospect_posts(engagement_status);
CREATE INDEX idx_prospect_posts_scraped ON prospect_posts(scraped_at DESC);

-- RLS
ALTER TABLE prospect_posts ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne voient que leurs propres posts scrappés
CREATE POLICY "Users can view own prospect posts"
  ON prospect_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prospect posts"
  ON prospect_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prospect posts"
  ON prospect_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prospect posts"
  ON prospect_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Admin et manager voient tout
CREATE POLICY "Admin/manager can view all prospect posts"
  ON prospect_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
