-- ============================================================
-- SALES SYSTEM — Full Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============ UTILISATEURS & RÔLES ============

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'client_b2c',
  phone TEXT,
  company TEXT,
  niche TEXT,
  current_revenue TEXT,
  goals TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 0,
  health_score INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'client_b2c'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ CRM & PIPELINE ============

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL,
  color TEXT DEFAULT '#7af17a',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pipeline_stages (name, position, color) VALUES
  ('Prospect', 0, '#6b6b6b'),
  ('Contacté', 1, '#3b82f6'),
  ('Appel Découverte', 2, '#f59e0b'),
  ('Proposition', 3, '#8b5cf6'),
  ('Closing', 4, '#ef4444'),
  ('Client Signé', 5, '#7af17a');

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES profiles(id),
  stage_id UUID REFERENCES pipeline_stages(id),
  title TEXT NOT NULL,
  value DECIMAL(10,2) DEFAULT 0,
  probability INT DEFAULT 50,
  source TEXT,
  assigned_to UUID REFERENCES profiles(id),
  tags TEXT[] DEFAULT '{}',
  temperature TEXT DEFAULT 'warm',
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PRISE DE RDV ============

CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  day_of_week INT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  slot_type TEXT DEFAULT 'discovery',
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT,
  assigned_to UUID REFERENCES profiles(id),
  slot_type TEXT DEFAULT 'discovery',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'confirmed',
  meeting_link TEXT,
  qualification_data JSONB DEFAULT '{}',
  reliability_score INT DEFAULT 100,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CONTRATS ============

CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  deal_id UUID REFERENCES deals(id),
  template_id UUID REFERENCES contract_templates(id),
  content TEXT NOT NULL,
  amount DECIMAL(10,2),
  payment_schedule TEXT,
  status TEXT DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ONBOARDING ============

CREATE TABLE onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  step_type TEXT DEFAULT 'action',
  content JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT TRUE
);

CREATE TABLE client_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  step_id UUID REFERENCES onboarding_steps(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  response_data JSONB DEFAULT '{}',
  UNIQUE(client_id, step_id)
);

-- ============ ACADEMY / FORMATION ============

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  target_roles TEXT[] DEFAULT '{setter, closer}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  video_url TEXT,
  transcript TEXT,
  duration_minutes INT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  questions JSONB NOT NULL
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  lesson_id UUID REFERENCES lessons(id),
  completed BOOLEAN DEFAULT FALSE,
  quiz_score INT,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  niche TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection TEXT NOT NULL,
  best_responses JSONB NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ GAMIFICATION ============

CREATE TABLE gamification_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  level INT DEFAULT 1,
  level_name TEXT DEFAULT 'Setter Débutant',
  total_points INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  badges JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_value INT NOT NULL,
  metric TEXT NOT NULL,
  points_reward INT DEFAULT 100,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  challenge_id UUID REFERENCES challenges(id),
  current_value INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);

-- ============ COMMUNICATION ============

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group',
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  members UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default channels
INSERT INTO channels (name, type, description) VALUES
  ('annonces', 'announcement', 'Annonces officielles de l''équipe'),
  ('questions', 'group', 'Posez vos questions ici'),
  ('wins', 'group', 'Partagez vos victoires'),
  ('technique', 'group', 'Discussion technique et scripts'),
  ('bienvenue', 'group', 'Présentez-vous à la communauté');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  message_type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  is_edited BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CALLS DE GROUPE ============

CREATE TABLE group_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  meeting_link TEXT,
  replay_url TEXT,
  replay_timestamps JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_call_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES group_calls(id),
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'registered',
  UNIQUE(call_id, user_id)
);

-- ============ CUSTOMER SUCCESS ============

CREATE TABLE client_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  bookings_count INT DEFAULT 0,
  show_up_rate DECIMAL(5,2) DEFAULT 0,
  closing_rate DECIMAL(5,2) DEFAULT 0,
  revenue_signed DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  score INT,
  comment TEXT,
  trigger_day INT,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  content TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PROSPECTION ============

CREATE TABLE prospect_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES prospect_lists(id),
  name TEXT NOT NULL,
  profile_url TEXT,
  platform TEXT,
  status TEXT DEFAULT 'new',
  last_message_at TIMESTAMPTZ,
  notes TEXT,
  conversation_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT,
  step TEXT,
  niche TEXT,
  content TEXT NOT NULL,
  variant TEXT DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  dms_sent INT DEFAULT 0,
  dms_target INT DEFAULT 20,
  replies_received INT DEFAULT 0,
  bookings_from_dms INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ============ CONTENT PLANNER ============

CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  platform TEXT,
  framework TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ COMMUNAUTÉ ============

CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  type TEXT DEFAULT 'discussion',
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ AFFILIATION ============

CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  total_referrals INT DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  referred_email TEXT,
  status TEXT DEFAULT 'pending',
  converted_at TIMESTAMPTZ,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ AUDIT LOG ============

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_call_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin/manager can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===== PIPELINE STAGES =====
CREATE POLICY "Anyone authenticated can view stages" ON pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can manage stages" ON pipeline_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- ===== DEALS =====
CREATE POLICY "Admin/manager can view all deals" ON deals FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Setter/closer can view own deals" ON deals FOR SELECT USING (
  assigned_to = auth.uid() OR contact_id = auth.uid()
);
CREATE POLICY "Admin/manager can manage deals" ON deals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Setter/closer can update own deals" ON deals FOR UPDATE USING (assigned_to = auth.uid());
CREATE POLICY "Authenticated users can insert deals" ON deals FOR INSERT TO authenticated WITH CHECK (true);

-- ===== BOOKINGS =====
CREATE POLICY "Admin/manager can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Assigned user can view bookings" ON bookings FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "Anyone can insert bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (true);

-- ===== CHANNELS & MESSAGES =====
CREATE POLICY "Authenticated can view channels" ON channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send messages" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- ===== COURSES & LESSONS =====
CREATE POLICY "Authenticated can view published courses" ON courses FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admin/manager can manage courses" ON courses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Authenticated can view lessons" ON lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view quizzes" ON quizzes FOR SELECT TO authenticated USING (true);

-- ===== LESSON PROGRESS =====
CREATE POLICY "Users can manage own progress" ON lesson_progress FOR ALL USING (user_id = auth.uid());

-- ===== NOTIFICATIONS =====
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ===== COMMUNITY =====
CREATE POLICY "Authenticated can view community posts" ON community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create community posts" ON community_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authenticated can view comments" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create comments" ON community_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- ===== CONTRACTS =====
CREATE POLICY "Admin/manager can manage contracts" ON contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Client can view own contracts" ON contracts FOR SELECT USING (client_id = auth.uid());

-- ===== GROUP CALLS =====
CREATE POLICY "Authenticated can view group calls" ON group_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can manage group calls" ON group_calls FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- ===== GAMIFICATION =====
CREATE POLICY "Users can view own gamification" ON gamification_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated can view all gamification for leaderboard" ON gamification_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view challenges" ON challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own challenge progress" ON challenge_progress FOR ALL USING (user_id = auth.uid());

-- ===== SCRIPTS & OBJECTIONS =====
CREATE POLICY "Authenticated can view scripts" ON scripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view objections" ON objections FOR SELECT TO authenticated USING (true);

-- ===== CLIENT KPIS =====
CREATE POLICY "Admin/manager can view all kpis" ON client_kpis FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Client can view own kpis" ON client_kpis FOR SELECT USING (client_id = auth.uid());

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
