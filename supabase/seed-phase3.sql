-- Phase 3: Growth Features — New Tables + RLS + Seed Data

-- ============================================
-- 1. Community Comments
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_comments_select" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_comments_insert" ON community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "community_comments_delete_admin" ON community_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- ============================================
-- 2. Affiliates
-- ============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INT DEFAULT 0,
  total_converted INT DEFAULT 0,
  total_commission NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliates_select_own" ON affiliates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "affiliates_insert" ON affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliates_update_own" ON affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 3. Referrals
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  referred_email TEXT,
  referred_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, converted, expired
  deal_id UUID REFERENCES deals(id),
  commission NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select" ON referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM affiliates WHERE affiliates.id = referrals.affiliate_id AND affiliates.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "referrals_insert" ON referrals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "referrals_update" ON referrals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- ============================================
-- 4. DM Conversations
-- ============================================
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  messages JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_conversations_select" ON dm_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
CREATE POLICY "dm_conversations_insert" ON dm_conversations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
CREATE POLICY "dm_conversations_update" ON dm_conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));

-- ============================================
-- 5. Voice Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  voice_id TEXT,
  sample_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, ready
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_profiles_select" ON voice_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "voice_profiles_insert" ON voice_profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "voice_profiles_update" ON voice_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 6. Voice Messages
-- ============================================
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_profile_id UUID REFERENCES voice_profiles(id),
  input_text TEXT,
  input_audio_url TEXT,
  output_audio_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, ready, failed
  scheduled_send_at TIMESTAMPTZ,
  sent BOOLEAN DEFAULT FALSE,
  target_prospect_id UUID REFERENCES prospects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_messages_select" ON voice_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "voice_messages_insert" ON voice_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "voice_messages_update" ON voice_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- ============================================
-- Add hidden column to community_posts for moderation
-- ============================================
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- ============================================
-- RLS for community_posts (insert/update/delete)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'community_posts_insert' AND tablename = 'community_posts') THEN
    CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'community_posts_update_own' AND tablename = 'community_posts') THEN
    CREATE POLICY "community_posts_update_own" ON community_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'community_posts_delete_admin' AND tablename = 'community_posts') THEN
    CREATE POLICY "community_posts_delete_admin" ON community_posts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- ============================================
-- RLS for content_posts
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_posts_select' AND tablename = 'content_posts') THEN
    CREATE POLICY "content_posts_select" ON content_posts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_posts_insert' AND tablename = 'content_posts') THEN
    CREATE POLICY "content_posts_insert" ON content_posts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_posts_update' AND tablename = 'content_posts') THEN
    CREATE POLICY "content_posts_update" ON content_posts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_posts_delete' AND tablename = 'content_posts') THEN
    CREATE POLICY "content_posts_delete" ON content_posts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- ============================================
-- RLS for prospects
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_insert' AND tablename = 'prospects') THEN
    CREATE POLICY "prospects_insert" ON prospects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_update' AND tablename = 'prospects') THEN
    CREATE POLICY "prospects_update" ON prospects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_delete' AND tablename = 'prospects') THEN
    CREATE POLICY "prospects_delete" ON prospects FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- ============================================
-- RLS for dm_templates
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_templates_select' AND tablename = 'dm_templates') THEN
    CREATE POLICY "dm_templates_select" ON dm_templates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','setter','closer')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_templates_insert' AND tablename = 'dm_templates') THEN
    CREATE POLICY "dm_templates_insert" ON dm_templates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_templates_update' AND tablename = 'dm_templates') THEN
    CREATE POLICY "dm_templates_update" ON dm_templates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_templates_delete' AND tablename = 'dm_templates') THEN
    CREATE POLICY "dm_templates_delete" ON dm_templates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- ============================================
-- RLS for daily_quotas
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_quotas_select' AND tablename = 'daily_quotas') THEN
    CREATE POLICY "daily_quotas_select" ON daily_quotas FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_quotas_insert' AND tablename = 'daily_quotas') THEN
    CREATE POLICY "daily_quotas_insert" ON daily_quotas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_quotas_update' AND tablename = 'daily_quotas') THEN
    CREATE POLICY "daily_quotas_update" ON daily_quotas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- SEED DATA: DM Templates
-- ============================================
INSERT INTO dm_templates (name, platform, step, niche, content, variant) VALUES
  ('Accroche LinkedIn A', 'linkedin', 'accroche', NULL,
   'Salut {{prenom}} ! J''ai vu ton profil et j''ai remarqué que tu es dans {{niche}}. J''accompagne des entrepreneurs comme toi à structurer leur process de vente pour scaler. Est-ce que c''est un sujet pour toi ?',
   'A'),
  ('Accroche LinkedIn B', 'linkedin', 'accroche', NULL,
   'Hey {{prenom}}, je bosse avec des {{niche}} qui galèrent à closer. J''ai développé une méthode qui les aide à doubler leur CA en 90 jours. Ça te parle ?',
   'B'),
  ('Follow-up J+2', 'linkedin', 'follow_up', NULL,
   'Re {{prenom}} ! Je me permets de te relancer car je sais que LinkedIn c''est le bazar 😅 Est-ce que tu as eu le temps de voir mon message ?',
   'A'),
  ('Relance J+5', 'linkedin', 'relance', NULL,
   '{{prenom}}, je ne veux pas être insistant mais j''ai aidé [X clients] ce mois à {{pain_point}}. Si c''est pas le bon moment, dis-le moi et je ne t''embête plus !',
   'A'),
  ('Break-up', 'linkedin', 'break_up', NULL,
   'Salut {{prenom}}, c''est mon dernier message ! Si tu changes d''avis sur le fait de structurer ta vente, tu sais où me trouver. Bonne continuation 🙏',
   'A'),
  ('Accroche Instagram A', 'instagram', 'accroche', NULL,
   'Hey {{prenom}} ! 🔥 J''ai maté ton profil et j''adore ce que tu fais dans {{niche}}. J''aide des entrepreneurs à passer de la prospection galère au closing systématique. Ça te dirait qu''on en parle ?',
   'A'),
  ('Accroche Instagram B', 'instagram', 'accroche', NULL,
   'Yo {{prenom}} ! Je viens de voir ta story sur {{pain_point}} et franchement je kiffe ton énergie. J''ai un truc qui pourrait t''intéresser pour booster tes ventes. On s''en parle en DM ?',
   'B')
ON CONFLICT DO NOTHING;
