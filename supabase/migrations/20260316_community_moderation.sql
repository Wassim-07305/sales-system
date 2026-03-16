-- Community Bans table
CREATE TABLE IF NOT EXISTS community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  lifted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_bans_user_id ON community_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_community_bans_active ON community_bans(user_id) WHERE lifted_at IS NULL;

-- Community Reports table
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'autre',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_post_id ON community_reports(post_id);

-- Community Moderation Logs table
CREATE TABLE IF NOT EXISTS community_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  moderator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'autre',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_moderation_logs_created ON community_moderation_logs(created_at DESC);

-- RLS policies
ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_moderation_logs ENABLE ROW LEVEL SECURITY;

-- community_bans: admin/manager can read and write
CREATE POLICY "Admin/manager can manage bans" ON community_bans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can check if they are banned
CREATE POLICY "Users can read own ban" ON community_bans
  FOR SELECT USING (user_id = auth.uid());

-- community_reports: anyone can insert, admin/manager can read/update
CREATE POLICY "Authenticated users can report" ON community_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admin/manager can read reports" ON community_reports
  FOR SELECT USING (
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin/manager can update reports" ON community_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- community_moderation_logs: admin/manager only
CREATE POLICY "Admin/manager can manage logs" ON community_moderation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
