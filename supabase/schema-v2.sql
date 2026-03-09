-- ============================================================
-- SALES SYSTEM — Schema V2: New Tables & ALTER Statements
-- Run this AFTER schema.sql in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: ALTER EXISTING TABLES
-- ============================================================

-- ===== profiles =====
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_ready_to_place BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matched_entrepreneur_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setter_maturity_score INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'standard';

-- ===== courses =====
ALTER TABLE courses ADD COLUMN IF NOT EXISTS has_prerequisites BOOLEAN DEFAULT FALSE;

-- ===== quizzes =====
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_attempts_per_day INT DEFAULT 3;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INT DEFAULT 90;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS randomize BOOLEAN DEFAULT TRUE;

-- ===== prospects =====
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS engagement_score INT DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS assigned_setter_id UUID REFERENCES profiles(id);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS auto_follow_up BOOLEAN DEFAULT FALSE;

-- ===== channels =====
ALTER TABLE channels ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all';

-- ===== community_posts =====
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS module_id TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- ===== contracts =====
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS installment_count INT DEFAULT 1;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

-- ===== challenges =====
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_team BOOLEAN DEFAULT FALSE;


-- ============================================================
-- PART 2: NEW TABLES
-- ============================================================

-- -------------------------------------------------------
-- 1. onboarding_quiz_responses
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  quiz_data JSONB,
  score INT,
  color_code TEXT,
  recommended_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. welcome_packs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS welcome_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role TEXT,
  items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. daily_journals
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  mood INT CHECK (mood >= 1 AND mood <= 5),
  wins TEXT,
  struggles TEXT,
  goals_tomorrow TEXT,
  conversations_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- -------------------------------------------------------
-- 4. course_prerequisites
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id),
  min_score INT DEFAULT 90,
  UNIQUE(course_id, prerequisite_course_id)
);

-- -------------------------------------------------------
-- 5. quiz_attempts
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  answers JSONB,
  score INT,
  passed BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. resource_library
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  resource_type TEXT,
  url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 7. revision_cards
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS revision_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT,
  answer TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 8. roleplay_prospect_profiles
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS roleplay_prospect_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  persona TEXT,
  niche TEXT,
  difficulty TEXT DEFAULT 'medium',
  objection_types TEXT[] DEFAULT '{}',
  network TEXT DEFAULT 'instagram',
  context JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 9. roleplay_sessions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  prospect_profile_id UUID REFERENCES roleplay_prospect_profiles(id),
  conversation JSONB DEFAULT '[]',
  ai_feedback JSONB DEFAULT '{}',
  score INT,
  duration_seconds INT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 10. prospect_scores
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  engagement_score INT DEFAULT 0,
  responsiveness_score INT DEFAULT 0,
  qualification_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  temperature TEXT DEFAULT 'cold',
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prospect_id)
);

-- -------------------------------------------------------
-- 11. follow_up_sequences
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  steps JSONB DEFAULT '[]',
  trigger_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 12. follow_up_tasks
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES follow_up_sequences(id),
  prospect_id UUID REFERENCES prospects(id),
  step_index INT DEFAULT 0,
  message_content TEXT,
  scheduled_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 13. ai_mode_configs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_mode_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  global_mode TEXT DEFAULT 'human',
  network_overrides JSONB DEFAULT '{}',
  critical_actions TEXT[] DEFAULT '{booking_confirmation,price_proposal,contract_send,voice_clone_send}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 14. whatsapp_connections
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  api_config JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 15. whatsapp_sequences
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  funnel_type TEXT,
  steps JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 16. whatsapp_messages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES whatsapp_connections(id),
  prospect_id UUID REFERENCES prospects(id),
  direction TEXT DEFAULT 'outbound',
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'queued',
  sequence_id UUID REFERENCES whatsapp_sequences(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 17. script_flowcharts
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS script_flowcharts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  category TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 18. mind_maps
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  category TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 19. script_templates
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS script_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  category TEXT,
  niche TEXT,
  network TEXT,
  flowchart_data JSONB DEFAULT '{}',
  content TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 20. video_rooms
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  channel_id UUID REFERENCES channels(id),
  host_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  ai_summary TEXT,
  chapters JSONB DEFAULT '[]',
  max_participants INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 21. video_room_participants
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ
);

-- -------------------------------------------------------
-- 22. polls
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id),
  room_id UUID REFERENCES video_rooms(id),
  created_by UUID REFERENCES profiles(id),
  question TEXT,
  options JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 23. poll_votes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  option_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- -------------------------------------------------------
-- 24. broadcast_messages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  target_roles TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT 'all',
  subject TEXT,
  content TEXT,
  sent_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 25. attribution_events
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  prospect_id UUID REFERENCES prospects(id),
  touchpoint_type TEXT,
  channel TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 26. setter_weekly_reports
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS setter_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id UUID NOT NULL REFERENCES profiles(id),
  week_start DATE NOT NULL,
  metrics JSONB DEFAULT '{}',
  summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(setter_id, week_start)
);

-- -------------------------------------------------------
-- 27. white_label_configs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  brand_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#7af17a',
  secondary_color TEXT DEFAULT '#14080e',
  custom_domain TEXT,
  enabled_modules TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 28. entrepreneur_reports
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrepreneur_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES profiles(id),
  report_month DATE NOT NULL,
  metrics JSONB DEFAULT '{}',
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entrepreneur_id, report_month)
);

-- -------------------------------------------------------
-- 29. payment_installments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  amount DECIMAL(10,2),
  due_date DATE,
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 30. invoices
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  client_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2),
  invoice_number TEXT UNIQUE,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 31. automation_rules
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 32. automation_executions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id),
  target_user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 33. marketplace_listings
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID REFERENCES profiles(id),
  title TEXT,
  description TEXT,
  niche TEXT,
  commission_type TEXT,
  commission_value DECIMAL(10,2),
  requirements JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 34. marketplace_applications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
  setter_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, setter_id)
);

-- -------------------------------------------------------
-- 35. setter_maturity_scores
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS setter_maturity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id UUID NOT NULL REFERENCES profiles(id),
  message_quality INT DEFAULT 0,
  objection_handling INT DEFAULT 0,
  consistency INT DEFAULT 0,
  volume INT DEFAULT 0,
  roleplay_performance INT DEFAULT 0,
  response_rate INT DEFAULT 0,
  overall_score INT DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 36. push_subscriptions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  endpoint TEXT NOT NULL,
  keys JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);


-- ============================================================
-- PART 3: ROW LEVEL SECURITY & POLICIES
-- ============================================================

-- -------------------------------------------------------
-- 1. onboarding_quiz_responses (user-specific)
-- -------------------------------------------------------
ALTER TABLE onboarding_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON onboarding_quiz_responses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON onboarding_quiz_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 2. welcome_packs (general)
-- -------------------------------------------------------
ALTER TABLE welcome_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON welcome_packs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON welcome_packs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON welcome_packs
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 3. daily_journals (user-specific)
-- -------------------------------------------------------
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON daily_journals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON daily_journals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 4. course_prerequisites (general)
-- -------------------------------------------------------
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON course_prerequisites
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON course_prerequisites
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON course_prerequisites
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 5. quiz_attempts (user-specific)
-- -------------------------------------------------------
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON quiz_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON quiz_attempts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 6. resource_library (general)
-- -------------------------------------------------------
ALTER TABLE resource_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON resource_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON resource_library
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON resource_library
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 7. revision_cards (general)
-- -------------------------------------------------------
ALTER TABLE revision_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON revision_cards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON revision_cards
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON revision_cards
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 8. roleplay_prospect_profiles (general)
-- -------------------------------------------------------
ALTER TABLE roleplay_prospect_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON roleplay_prospect_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON roleplay_prospect_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON roleplay_prospect_profiles
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 9. roleplay_sessions (user-specific)
-- -------------------------------------------------------
ALTER TABLE roleplay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON roleplay_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON roleplay_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 10. prospect_scores (general)
-- -------------------------------------------------------
ALTER TABLE prospect_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON prospect_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON prospect_scores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON prospect_scores
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 11. follow_up_sequences (general)
-- -------------------------------------------------------
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON follow_up_sequences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON follow_up_sequences
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON follow_up_sequences
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 12. follow_up_tasks (general)
-- -------------------------------------------------------
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON follow_up_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON follow_up_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON follow_up_tasks
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 13. ai_mode_configs (user-specific)
-- -------------------------------------------------------
ALTER TABLE ai_mode_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON ai_mode_configs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON ai_mode_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 14. whatsapp_connections (user-specific)
-- -------------------------------------------------------
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON whatsapp_connections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON whatsapp_connections
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 15. whatsapp_sequences (general)
-- -------------------------------------------------------
ALTER TABLE whatsapp_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON whatsapp_sequences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON whatsapp_sequences
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON whatsapp_sequences
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 16. whatsapp_messages (general)
-- -------------------------------------------------------
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON whatsapp_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON whatsapp_messages
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 17. script_flowcharts (general)
-- -------------------------------------------------------
ALTER TABLE script_flowcharts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON script_flowcharts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON script_flowcharts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON script_flowcharts
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 18. mind_maps (general)
-- -------------------------------------------------------
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON mind_maps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON mind_maps
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON mind_maps
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 19. script_templates (general)
-- -------------------------------------------------------
ALTER TABLE script_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON script_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON script_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON script_templates
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 20. video_rooms (general)
-- -------------------------------------------------------
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON video_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON video_rooms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON video_rooms
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 21. video_room_participants (general)
-- -------------------------------------------------------
ALTER TABLE video_room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON video_room_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON video_room_participants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON video_room_participants
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 22. polls (general)
-- -------------------------------------------------------
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON polls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON polls
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON polls
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 23. poll_votes (user-specific)
-- -------------------------------------------------------
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON poll_votes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON poll_votes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 24. broadcast_messages (general)
-- -------------------------------------------------------
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON broadcast_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON broadcast_messages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON broadcast_messages
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 25. attribution_events (general)
-- -------------------------------------------------------
ALTER TABLE attribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON attribution_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON attribution_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON attribution_events
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 26. setter_weekly_reports (user-specific via setter_id)
-- -------------------------------------------------------
ALTER TABLE setter_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON setter_weekly_reports
  FOR ALL TO authenticated
  USING (auth.uid() = setter_id)
  WITH CHECK (auth.uid() = setter_id);

CREATE POLICY "Admins manage all" ON setter_weekly_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 27. white_label_configs (user-specific via entrepreneur_id)
-- -------------------------------------------------------
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON white_label_configs
  FOR ALL TO authenticated
  USING (auth.uid() = entrepreneur_id)
  WITH CHECK (auth.uid() = entrepreneur_id);

CREATE POLICY "Admins manage all" ON white_label_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 28. entrepreneur_reports (user-specific via entrepreneur_id)
-- -------------------------------------------------------
ALTER TABLE entrepreneur_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON entrepreneur_reports
  FOR ALL TO authenticated
  USING (auth.uid() = entrepreneur_id)
  WITH CHECK (auth.uid() = entrepreneur_id);

CREATE POLICY "Admins manage all" ON entrepreneur_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 29. payment_installments (general)
-- -------------------------------------------------------
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON payment_installments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON payment_installments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON payment_installments
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 30. invoices (general)
-- -------------------------------------------------------
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON invoices
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 31. automation_rules (general)
-- -------------------------------------------------------
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON automation_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON automation_rules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON automation_rules
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 32. automation_executions (general)
-- -------------------------------------------------------
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON automation_executions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON automation_executions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON automation_executions
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 33. marketplace_listings (general)
-- -------------------------------------------------------
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view" ON marketplace_listings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON marketplace_listings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON marketplace_listings
  FOR UPDATE TO authenticated USING (true);

-- -------------------------------------------------------
-- 34. marketplace_applications (user-specific via setter_id)
-- -------------------------------------------------------
ALTER TABLE marketplace_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON marketplace_applications
  FOR ALL TO authenticated
  USING (auth.uid() = setter_id)
  WITH CHECK (auth.uid() = setter_id);

CREATE POLICY "Admins manage all" ON marketplace_applications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 35. setter_maturity_scores (user-specific via setter_id)
-- -------------------------------------------------------
ALTER TABLE setter_maturity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON setter_maturity_scores
  FOR ALL TO authenticated
  USING (auth.uid() = setter_id)
  WITH CHECK (auth.uid() = setter_id);

CREATE POLICY "Admins manage all" ON setter_maturity_scores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- -------------------------------------------------------
-- 36. push_subscriptions (user-specific)
-- -------------------------------------------------------
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all" ON push_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));


-- ============================================================
-- PART 4: REALTIME SUBSCRIPTIONS FOR NEW TABLES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE video_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE follow_up_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_journals;


-- ============================================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON daily_journals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_user ON roleplay_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_scheduled ON follow_up_tasks(scheduled_at) WHERE completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection ON whatsapp_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_prospect ON whatsapp_messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_prospect ON prospect_scores(prospect_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_deal ON attribution_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_contract ON payment_installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_listing ON marketplace_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_video_room_participants_room ON video_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_setter_maturity_scores_setter ON setter_maturity_scores(setter_id);
CREATE INDEX IF NOT EXISTS idx_resource_library_category ON resource_library(category);
CREATE INDEX IF NOT EXISTS idx_revision_cards_lesson ON revision_cards(lesson_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_sender ON broadcast_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_setter_weekly_reports_setter ON setter_weekly_reports(setter_id);
CREATE INDEX IF NOT EXISTS idx_entrepreneur_reports_entrepreneur ON entrepreneur_reports(entrepreneur_id);
