-- ===== REPORTED MESSAGES =====
CREATE TABLE IF NOT EXISTS reported_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  channel_id uuid,
  thread_id uuid,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  content text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reported_messages_status ON reported_messages(status);
CREATE INDEX idx_reported_messages_priority ON reported_messages(priority);
CREATE INDEX idx_reported_messages_author ON reported_messages(author_id);
CREATE INDEX idx_reported_messages_reporter ON reported_messages(reporter_id);

ALTER TABLE reported_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers view reported messages" ON reported_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Users can report messages" ON reported_messages
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins manage reported messages" ON reported_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ===== MODERATION ACTIONS =====
CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('warn', 'mute', 'ban', 'restrict', 'unmute', 'unban')),
  reason text NOT NULL,
  duration_hours integer,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_moderation_actions_user ON moderation_actions(user_id);
CREATE INDEX idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX idx_moderation_actions_active ON moderation_actions(is_active);

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers view moderation actions" ON moderation_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins manage moderation actions" ON moderation_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ===== MODERATION LOG =====
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'message', 'thread', 'channel', 'report')),
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_moderation_log_action ON moderation_log(action_type);
CREATE INDEX idx_moderation_log_target ON moderation_log(target_type, target_id);
CREATE INDEX idx_moderation_log_performer ON moderation_log(performed_by);
CREATE INDEX idx_moderation_log_created ON moderation_log(created_at DESC);

ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view moderation log" ON moderation_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins and managers insert log entries" ON moderation_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ===== MODERATION SETTINGS =====
CREATE TABLE IF NOT EXISTS moderation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read moderation settings" ON moderation_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage moderation settings" ON moderation_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default settings
INSERT INTO moderation_settings (setting_key, setting_value, description) VALUES
  ('auto_moderation', '{"enabled": false, "spam_filter": true, "profanity_filter": true, "link_filter": false}', 'Configuration de la moderation automatique'),
  ('mute_durations', '{"options": [1, 6, 24, 72, 168]}', 'Durees de mute disponibles en heures'),
  ('ban_appeal_days', '{"value": 30}', 'Delai en jours pour faire appel d''un ban'),
  ('report_threshold', '{"value": 3}', 'Nombre de signalements avant revue prioritaire'),
  ('content_warnings', '{"categories": ["violence", "adult", "sensitive"]}', 'Categories d''avertissement de contenu')
ON CONFLICT (setting_key) DO NOTHING;

-- ===== BANNED WORDS (for auto-moderation) =====
CREATE TABLE IF NOT EXISTS banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  is_regex boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_banned_words_active ON banned_words(is_active);

ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage banned words" ON banned_words
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Moderators view banned words" ON banned_words
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ===== USER MODERATION STATUS =====
CREATE TABLE IF NOT EXISTS user_moderation_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted boolean DEFAULT false,
  muted_until timestamptz,
  is_banned boolean DEFAULT false,
  banned_until timestamptz,
  is_restricted boolean DEFAULT false,
  restriction_level text CHECK (restriction_level IN ('limited', 'read_only', 'none')),
  warning_count integer DEFAULT 0,
  last_warning_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_moderation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own moderation status" ON user_moderation_status
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins manage moderation status" ON user_moderation_status
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Function to check if user can post
CREATE OR REPLACE FUNCTION can_user_post(check_user_id uuid)
RETURNS boolean AS $$
DECLARE
  status_rec user_moderation_status%ROWTYPE;
BEGIN
  SELECT * INTO status_rec FROM user_moderation_status WHERE user_id = check_user_id;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF status_rec.is_banned AND (status_rec.banned_until IS NULL OR status_rec.banned_until > now()) THEN
    RETURN false;
  END IF;

  IF status_rec.is_muted AND (status_rec.muted_until IS NULL OR status_rec.muted_until > now()) THEN
    RETURN false;
  END IF;

  IF status_rec.is_restricted AND status_rec.restriction_level = 'read_only' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
