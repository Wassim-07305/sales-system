-- ============================================================
-- SALES SYSTEM — Migration: New Feature Tables
-- ============================================================
-- This migration creates all tables referenced by recently
-- implemented server actions that are NOT yet present in
-- schema.sql or schema-v2.sql.
--
-- Tables created:
--   1.  calls                        (call tracking)
--   2.  contacts                     (contact database)
--   3.  dm_conversations             (DM inbox)
--   4.  user_settings                (key/value user prefs)
--   5.  ai_coach_conversations       (AI coach history)
--   6.  monthly_reports              (B2B monthly reports)
--   7.  saved_reports                (custom query reports)
--   8.  client_sops                  (B2B onboarding SOPs)
--   9.  coaching_objectives          (team coaching goals)
--  10.  development_plans            (individual dev plans)
--  11.  feedback_sessions            (manager feedback/coaching)
--  12.  support_tickets              (helpdesk tickets)
--  13.  support_ticket_messages      (ticket conversation)
--  14.  voice_profiles               (voice clone profiles)
--  15.  voice_messages               (generated voice msgs)
--  16.  channel_reads                (unread tracking)
--  17.  live_questions               (video room Q&A)
--  18.  notification_preferences     (per-user notif prefs)
--  19.  dashboard_widgets            (custom dashboard layout)
--  20.  script_shares                (flowchart/mindmap sharing)
--  21.  script_training_results      (script training scores)
--  22.  call_reviews                 (AI call analysis)
--  23.  prospect_segments            (prospect segmentation)
--  24.  user_consents                (GDPR consent tracking)
--  25.  import_logs                  (CSV import history)
--  26.  custom_field_definitions     (custom CRM fields)
--  27.  competitors                  (competitive intel)
--  28.  activity_logs                (enrichment activity log)
--  29.  reputation_events            (community reputation)
--  30.  skill_assessments            (setter skill tracking)
--  31.  resource_items               (resource library v2)
--  32.  partners                     (partner management)
--  33.  partner_referrals            (partner referral tracking)
--  34.  partner_payouts              (partner payout tracking)
--  35.  commission_rates             (marketplace commissions)
--  36.  extension_installs           (marketplace installs)
--  37.  extension_subscriptions      (marketplace subs)
--  38.  developer_payouts            (dev payout requests)
--  39.  training_groups              (group training)
--  40.  training_group_members       (group membership)
--  41.  training_group_sessions      (group sessions)
--  42.  feature_suggestions          (roadmap suggestions)
--  43.  feature_votes                (roadmap voting)
--  44.  moderation_settings          (auto-mod config)
--  45.  reported_messages            (flagged messages)
--  46.  moderation_log               (mod action log)
--  47.  moderation_actions           (user sanctions)
--  48.  user_moderation_status       (mute/ban status)
--  49.  banned_words                 (word filter list)
--
-- Also ALTERs:
--   - daily_journals: add columns used by gamification EOD
--   - community_posts: add hidden, target_audience columns
--   - client_onboarding: relax step_id FK to TEXT
--   - onboarding_quiz_responses: add answers column
--   - welcome_packs: add role column
-- ============================================================


-- ============================================================
-- PART 0: ALTER EXISTING TABLES (add missing columns)
-- ============================================================

-- daily_journals: gamification.ts uses extra columns
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS dms_sent INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS replies_received INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS calls_booked INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS calls_completed INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS deals_closed INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS revenue_generated DECIMAL(10,2) DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS blockers TEXT;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS plan_tomorrow TEXT;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- community_posts: moderation / audience columns
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all';

-- onboarding_quiz_responses: answers JSONB used by submitOnboardingQuiz
ALTER TABLE onboarding_quiz_responses ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}';

-- welcome_packs: role column used by getWelcomePack
ALTER TABLE welcome_packs ADD COLUMN IF NOT EXISTS role TEXT;

-- deals: extra columns for setter/closer tracking
ALTER TABLE deals ADD COLUMN IF NOT EXISTS setter_id UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES profiles(id);

-- audit_logs: details column used by gamification reward redemption
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- bookings: user_id column used by onboarding auto-booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES profiles(id);

-- prospects: user_id column used by gamification badge checks
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- deal_activities: description column
ALTER TABLE deal_activities ADD COLUMN IF NOT EXISTS description TEXT;

-- profiles: bio column for branding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- notifications: message column (alternate to body)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;


-- ============================================================
-- PART 1: NEW TABLES
-- ============================================================

-- 1. calls
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  contact_id UUID REFERENCES profiles(id),
  direction TEXT DEFAULT 'outbound',
  duration INT DEFAULT 0,
  outcome TEXT,
  notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. contacts (standalone contact book, separate from profiles)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. dm_conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id),
  platform TEXT DEFAULT 'instagram',
  messages JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ,
  linkedin_conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. user_settings (key/value store)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 5. ai_coach_conversations
CREATE TABLE IF NOT EXISTS ai_coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  question TEXT NOT NULL,
  answer TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. monthly_reports
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  period TEXT NOT NULL,
  report_data JSONB DEFAULT '{}',
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, period)
);

-- 7. saved_reports
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES profiles(id),
  last_run_at TIMESTAMPTZ,
  last_result_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. client_sops
CREATE TABLE IF NOT EXISTS client_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  sop_data JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. coaching_objectives
CREATE TABLE IF NOT EXISTS coaching_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  target_value INT DEFAULT 0,
  current_value INT DEFAULT 0,
  target_date DATE NOT NULL,
  target_type TEXT,
  status TEXT DEFAULT 'in_progress',
  assignee_id UUID NOT NULL REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  user_id UUID REFERENCES profiles(id),
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. development_plans
CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  skills JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  resources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. feedback_sessions
CREATE TABLE IF NOT EXISTS feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id),
  member_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT DEFAULT 'feedback',
  title TEXT,
  content TEXT,
  rating INT,
  action_items JSONB DEFAULT '[]',
  deal_id UUID REFERENCES deals(id),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_name TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. support_ticket_messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT DEFAULT 'user',
  sender_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. voice_profiles
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  sample_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. voice_messages
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_profile_id UUID REFERENCES voice_profiles(id),
  input_text TEXT,
  audio_url TEXT,
  target_prospect_id UUID REFERENCES prospects(id),
  scheduled_send_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. channel_reads (unread message tracking)
CREATE TABLE IF NOT EXISTS channel_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 17. live_questions (video room Q&A)
CREATE TABLE IF NOT EXISTS live_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  notify_deals BOOLEAN DEFAULT TRUE,
  notify_bookings BOOLEAN DEFAULT TRUE,
  notify_challenges BOOLEAN DEFAULT TRUE,
  notify_community BOOLEAN DEFAULT TRUE,
  notify_team BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. dashboard_widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  position INT DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. script_shares
CREATE TABLE IF NOT EXISTS script_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL,
  script_type TEXT NOT NULL,
  shared_by UUID NOT NULL REFERENCES profiles(id),
  shared_with UUID NOT NULL REFERENCES profiles(id),
  permission TEXT DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, shared_with)
);

-- 21. script_training_results
CREATE TABLE IF NOT EXISTS script_training_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES script_flowcharts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  score INT DEFAULT 0,
  duration INT DEFAULT 0,
  missed_nodes JSONB DEFAULT '[]',
  feedback JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. call_reviews (AI call analysis)
CREATE TABLE IF NOT EXISTS call_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id),
  transcript TEXT,
  ai_analysis JSONB DEFAULT '{}',
  score INT DEFAULT 0,
  keywords JSONB DEFAULT '[]',
  sentiment TEXT,
  strengths JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  prospect_name TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. prospect_segments
CREATE TABLE IF NOT EXISTS prospect_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '{}',
  color TEXT DEFAULT '#7af17a',
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. user_consents (GDPR)
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  analytics BOOLEAN DEFAULT FALSE,
  marketing BOOLEAN DEFAULT FALSE,
  communication BOOLEAN DEFAULT FALSE,
  third_party_sharing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. import_logs
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  total_rows INT DEFAULT 0,
  imported INT DEFAULT 0,
  skipped INT DEFAULT 0,
  errors INT DEFAULT 0,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. custom_field_definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  position INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. competitors
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  notes TEXT,
  strengths TEXT,
  weaknesses TEXT,
  pricing TEXT,
  threat_level TEXT DEFAULT 'medium',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. reputation_events (community gamification)
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  points INT DEFAULT 0,
  awarded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. skill_assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  skill_name TEXT NOT NULL,
  score INT DEFAULT 0,
  max_score INT DEFAULT 100,
  assessed_by UUID REFERENCES profiles(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. resource_items
CREATE TABLE IF NOT EXISTS resource_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  resource_type TEXT,
  url TEXT,
  file_url TEXT,
  target_roles TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. partners
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  type TEXT DEFAULT 'affiliate',
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. partner_referrals
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  referred_email TEXT,
  referred_name TEXT,
  status TEXT DEFAULT 'pending',
  commission_amount DECIMAL(10,2) DEFAULT 0,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 34. partner_payouts
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  amount DECIMAL(10,2) NOT NULL,
  period TEXT,
  payment_method TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 35. commission_rates
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  rate TEXT,
  rate_type TEXT DEFAULT 'percentage',
  description TEXT,
  example TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 36. extension_installs
CREATE TABLE IF NOT EXISTS extension_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id TEXT NOT NULL,
  extension_name TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 37. extension_subscriptions
CREATE TABLE IF NOT EXISTS extension_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  extension_id TEXT NOT NULL,
  extension_name TEXT,
  tier TEXT DEFAULT 'free',
  price DECIMAL(10,2) DEFAULT 0,
  billing_period TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. developer_payouts
CREATE TABLE IF NOT EXISTS developer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  period TEXT,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 39. training_groups
CREATE TABLE IF NOT EXISTS training_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  niche TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 40. training_group_members
CREATE TABLE IF NOT EXISTS training_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES training_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 41. training_group_sessions
CREATE TABLE IF NOT EXISTS training_group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES training_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ,
  type TEXT DEFAULT 'practice',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 42. feature_suggestions
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'submitted',
  votes INT DEFAULT 0,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 43. feature_votes
CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id)
);

-- 44. moderation_settings
CREATE TABLE IF NOT EXISTS moderation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB DEFAULT '{}',
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 45. reported_messages
CREATE TABLE IF NOT EXISTS reported_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  channel_id UUID REFERENCES channels(id),
  thread_id UUID,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  author_id UUID REFERENCES profiles(id),
  author_name TEXT,
  content TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 46. moderation_log
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  performed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 47. moderation_actions
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  reason TEXT,
  duration_hours INT,
  is_active BOOLEAN DEFAULT TRUE,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 48. user_moderation_status
CREATE TABLE IF NOT EXISTS user_moderation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_until TIMESTAMPTZ,
  ban_reason TEXT,
  restriction_level TEXT,
  warning_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 49. banned_words
CREATE TABLE IF NOT EXISTS banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- PART 2: ROW LEVEL SECURITY
-- ============================================================

-- 1. calls (user-specific)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calls" ON calls FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all calls" ON calls FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 2. contacts (authenticated access)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contacts" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete contacts" ON contacts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 3. dm_conversations (authenticated access)
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view dm_conversations" ON dm_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert dm_conversations" ON dm_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update dm_conversations" ON dm_conversations FOR UPDATE TO authenticated USING (true);

-- 4. user_settings (user-specific)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all settings" ON user_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 5. ai_coach_conversations (user-specific)
ALTER TABLE ai_coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_coach" ON ai_coach_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all ai_coach" ON ai_coach_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 6. monthly_reports (client + admin)
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client can view own reports" ON monthly_reports FOR SELECT TO authenticated
  USING (auth.uid() = client_id);
CREATE POLICY "Admins manage all monthly_reports" ON monthly_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 7. saved_reports (user-specific)
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved_reports" ON saved_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all saved_reports" ON saved_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 8. client_sops (user-specific)
ALTER TABLE client_sops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sops" ON client_sops FOR ALL TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Admins manage all sops" ON client_sops FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 9. coaching_objectives (assignee + admin)
ALTER TABLE coaching_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own objectives" ON coaching_objectives FOR SELECT TO authenticated
  USING (auth.uid() = assignee_id OR auth.uid() = created_by);
CREATE POLICY "Admins manage all objectives" ON coaching_objectives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Users can insert objectives" ON coaching_objectives FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Users update own objectives" ON coaching_objectives FOR UPDATE TO authenticated
  USING (auth.uid() = assignee_id OR auth.uid() = created_by);

-- 10. development_plans (user-specific)
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dev_plan" ON development_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all dev_plans" ON development_plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 11. feedback_sessions (member + manager)
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own feedback" ON feedback_sessions FOR SELECT TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = manager_id);
CREATE POLICY "Managers create feedback" ON feedback_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Managers manage feedback" ON feedback_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 12. support_tickets (user-specific + admin)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tickets" ON support_tickets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all tickets" ON support_tickets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 13. support_ticket_messages (authenticated)
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ticket_messages" ON support_ticket_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ticket_messages" ON support_ticket_messages FOR INSERT TO authenticated WITH CHECK (true);

-- 14. voice_profiles (user-specific)
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own voice_profile" ON voice_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all voice_profiles" ON voice_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 15. voice_messages (authenticated)
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view voice_messages" ON voice_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert voice_messages" ON voice_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update voice_messages" ON voice_messages FOR UPDATE TO authenticated USING (true);

-- 16. channel_reads (user-specific)
ALTER TABLE channel_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reads" ON channel_reads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 17. live_questions (authenticated)
ALTER TABLE live_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view questions" ON live_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert questions" ON live_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update questions" ON live_questions FOR UPDATE TO authenticated USING (true);

-- 18. notification_preferences (user-specific)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notif_prefs" ON notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 19. dashboard_widgets (user-specific)
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own widgets" ON dashboard_widgets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 20. script_shares (shared_by or shared_with)
ALTER TABLE script_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own shares" ON script_shares FOR SELECT TO authenticated
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);
CREATE POLICY "Users insert shares" ON script_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by);
CREATE POLICY "Admins manage all shares" ON script_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 21. script_training_results (user-specific)
ALTER TABLE script_training_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training_results" ON script_training_results FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all training_results" ON script_training_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 22. call_reviews (user-specific)
ALTER TABLE call_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews" ON call_reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all reviews" ON call_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 23. prospect_segments (user-specific)
ALTER TABLE prospect_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own segments" ON prospect_segments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all segments" ON prospect_segments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 24. user_consents (user-specific)
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consents" ON user_consents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all consents" ON user_consents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 25. import_logs (user-specific)
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own imports" ON import_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all imports" ON import_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 26. custom_field_definitions (authenticated)
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view custom_fields" ON custom_field_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage custom_fields" ON custom_field_definitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 27. competitors (authenticated)
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view competitors" ON competitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert competitors" ON competitors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage competitors" ON competitors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 28. activity_logs (user-specific)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON activity_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all activity" ON activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 29. reputation_events (authenticated)
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view reputation" ON reputation_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert reputation" ON reputation_events FOR INSERT TO authenticated WITH CHECK (true);

-- 30. skill_assessments (user-specific + admin)
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own assessments" ON skill_assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all assessments" ON skill_assessments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 31. resource_items (authenticated)
ALTER TABLE resource_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view resources" ON resource_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert resources" ON resource_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update resources" ON resource_items FOR UPDATE TO authenticated USING (true);

-- 32. partners (admin-only)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view partners" ON partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage partners" ON partners FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 33. partner_referrals (authenticated)
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view referrals" ON partner_referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert referrals" ON partner_referrals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update referrals" ON partner_referrals FOR UPDATE TO authenticated USING (true);

-- 34. partner_payouts (authenticated)
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view payouts" ON partner_payouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payouts" ON partner_payouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 35. commission_rates (authenticated read, admin write)
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view rates" ON commission_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage rates" ON commission_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 36. extension_installs (authenticated)
ALTER TABLE extension_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view installs" ON extension_installs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert installs" ON extension_installs FOR INSERT TO authenticated WITH CHECK (true);

-- 37. extension_subscriptions (user-specific + admin)
ALTER TABLE extension_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON extension_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert subscriptions" ON extension_subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage all subscriptions" ON extension_subscriptions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 38. developer_payouts (user-specific)
ALTER TABLE developer_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dev_payouts" ON developer_payouts FOR ALL TO authenticated
  USING (auth.uid() = developer_id) WITH CHECK (auth.uid() = developer_id);
CREATE POLICY "Admins manage all dev_payouts" ON developer_payouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 39. training_groups (authenticated)
ALTER TABLE training_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view groups" ON training_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert groups" ON training_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update groups" ON training_groups FOR UPDATE TO authenticated USING (true);

-- 40. training_group_members (authenticated)
ALTER TABLE training_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view group_members" ON training_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert group_members" ON training_group_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete group_members" ON training_group_members FOR DELETE TO authenticated USING (true);

-- 41. training_group_sessions (authenticated)
ALTER TABLE training_group_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view group_sessions" ON training_group_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert group_sessions" ON training_group_sessions FOR INSERT TO authenticated WITH CHECK (true);

-- 42. feature_suggestions (authenticated)
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view suggestions" ON feature_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert suggestions" ON feature_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage suggestions" ON feature_suggestions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 43. feature_votes (user-specific)
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view votes" ON feature_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own votes" ON feature_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 44. moderation_settings (admin)
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mod_settings" ON moderation_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Authenticated can view mod_settings" ON moderation_settings FOR SELECT TO authenticated USING (true);

-- 45. reported_messages (reporter + admin)
ALTER TABLE reported_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reports" ON reported_messages FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
CREATE POLICY "Admins manage all reports" ON reported_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Users can report messages" ON reported_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- 46. moderation_log (admin)
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mod_log" ON moderation_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 47. moderation_actions (admin)
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mod_actions" ON moderation_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 48. user_moderation_status (admin + self-view)
ALTER TABLE user_moderation_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mod_status" ON user_moderation_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all mod_status" ON user_moderation_status FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 49. banned_words (admin)
ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view banned_words" ON banned_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage banned_words" ON banned_words FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));


-- ============================================================
-- PART 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_prospect ON dm_conversations(prospect_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_last_msg ON dm_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, key);
CREATE INDEX IF NOT EXISTS idx_ai_coach_user ON ai_coach_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_client ON monthly_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period ON monthly_reports(period);
CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_client_sops_client ON client_sops(client_id);
CREATE INDEX IF NOT EXISTS idx_coaching_objectives_assignee ON coaching_objectives(assignee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_objectives_created_by ON coaching_objectives(created_by);
CREATE INDEX IF NOT EXISTS idx_coaching_objectives_status ON coaching_objectives(status);
CREATE INDEX IF NOT EXISTS idx_development_plans_user ON development_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_member ON feedback_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_manager ON feedback_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_type ON feedback_sessions(type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_profile ON voice_messages(voice_profile_id);
CREATE INDEX IF NOT EXISTS idx_channel_reads_user ON channel_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_reads_channel ON channel_reads(channel_id);
CREATE INDEX IF NOT EXISTS idx_live_questions_room ON live_questions(room_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_script_shares_shared_with ON script_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_script_shares_script ON script_shares(script_id);
CREATE INDEX IF NOT EXISTS idx_script_training_results_user ON script_training_results(user_id);
CREATE INDEX IF NOT EXISTS idx_script_training_results_script ON script_training_results(script_id);
CREATE INDEX IF NOT EXISTS idx_call_reviews_user ON call_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_segments_user ON prospect_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_user ON import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_reputation_events_user ON reputation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user ON skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_items_category ON resource_items(category);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_extension_installs_user ON extension_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_subscriptions_user ON extension_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_payouts_developer ON developer_payouts(developer_id);
CREATE INDEX IF NOT EXISTS idx_training_group_members_group ON training_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_training_group_sessions_group ON training_group_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_suggestion ON feature_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_reported_messages_status ON reported_messages(status);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_performed_by ON moderation_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_banned_words_active ON banned_words(is_active);


-- ============================================================
-- PART 4: REALTIME SUBSCRIPTIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
