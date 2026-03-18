-- Live Sessions (1-to-1 calls + admin lives)
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'one_on_one' CHECK (session_type IN ('one_on_one', 'live', 'screen_share')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  actual_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_guest ON live_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_at);

-- RLS
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Admin sees all
CREATE POLICY "admin_full_access_live" ON live_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Host can manage own sessions
CREATE POLICY "host_manage_live" ON live_sessions
  FOR ALL USING (host_id = auth.uid());

-- Guest can view sessions they're invited to
CREATE POLICY "guest_view_live" ON live_sessions
  FOR SELECT USING (guest_id = auth.uid());

-- Anyone authenticated can view live sessions (for discovery)
CREATE POLICY "view_active_lives" ON live_sessions
  FOR SELECT USING (status = 'live');
