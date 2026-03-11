-- ============================================================
-- Migration: Comprehensive RLS Policies
-- Date: 2026-03-10
-- Description: Fix missing policies on schema-v1 tables,
--              tighten overly permissive policies on schema-v2 tables,
--              add helper function for role checks.
-- ============================================================

-- ============================================================
-- HELPER: Reusable role-check function (avoids repeated subqueries)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = ANY(required_roles)
  );
$$;

-- Shorthand: is current user admin or manager?
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role(ARRAY['admin', 'manager']);
$$;

-- Shorthand: is current user part of the sales team?
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role(ARRAY['admin', 'manager', 'setter', 'closer']);
$$;


-- ============================================================
-- PART 1: MISSING POLICIES ON SCHEMA-V1 TABLES
-- (RLS was enabled but no policies were created)
-- ============================================================

-- -------------------------------------------------------
-- deal_activities
-- -------------------------------------------------------
CREATE POLICY "Admin/manager view all deal activities"
  ON deal_activities FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Team members view own deal activities"
  ON deal_activities FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
        AND (deals.assigned_to = auth.uid() OR deals.contact_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated can insert deal activities"
  ON deal_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/manager manage deal activities"
  ON deal_activities FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- booking_slots
-- -------------------------------------------------------
CREATE POLICY "Users manage own booking slots"
  ON booking_slots FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/manager manage all booking slots"
  ON booking_slots FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Authenticated view active booking slots"
  ON booking_slots FOR SELECT TO authenticated
  USING (is_active = true);

-- -------------------------------------------------------
-- contract_templates
-- -------------------------------------------------------
CREATE POLICY "Authenticated view contract templates"
  ON contract_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage contract templates"
  ON contract_templates FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- onboarding_steps
-- -------------------------------------------------------
CREATE POLICY "Authenticated view onboarding steps"
  ON onboarding_steps FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage onboarding steps"
  ON onboarding_steps FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- client_onboarding
-- -------------------------------------------------------
CREATE POLICY "Client manage own onboarding"
  ON client_onboarding FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admin/manager manage all onboarding"
  ON client_onboarding FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- nps_surveys
-- -------------------------------------------------------
CREATE POLICY "Client view/respond own NPS"
  ON nps_surveys FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Client update own NPS"
  ON nps_surveys FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "Admin/manager manage all NPS"
  ON nps_surveys FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- testimonials
-- -------------------------------------------------------
CREATE POLICY "Client manage own testimonials"
  ON testimonials FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admin/manager manage all testimonials"
  ON testimonials FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Authenticated view approved testimonials"
  ON testimonials FOR SELECT TO authenticated
  USING (status = 'approved');

-- -------------------------------------------------------
-- prospect_lists
-- -------------------------------------------------------
CREATE POLICY "Creator manage own prospect lists"
  ON prospect_lists FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all prospect lists"
  ON prospect_lists FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Team view all prospect lists"
  ON prospect_lists FOR SELECT
  USING (public.is_team_member());

-- -------------------------------------------------------
-- prospects
-- -------------------------------------------------------
CREATE POLICY "Assigned setter manage own prospects"
  ON prospects FOR ALL
  USING (assigned_setter_id = auth.uid())
  WITH CHECK (assigned_setter_id = auth.uid());

CREATE POLICY "Team view all prospects"
  ON prospects FOR SELECT
  USING (public.is_team_member());

CREATE POLICY "Team insert prospects"
  ON prospects FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Admin/manager manage all prospects"
  ON prospects FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- dm_templates
-- -------------------------------------------------------
CREATE POLICY "Authenticated view dm templates"
  ON dm_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/manager manage dm templates"
  ON dm_templates FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- daily_quotas
-- -------------------------------------------------------
CREATE POLICY "Users manage own quotas"
  ON daily_quotas FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/manager view all quotas"
  ON daily_quotas FOR SELECT
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- content_posts
-- -------------------------------------------------------
CREATE POLICY "Creator manage own content posts"
  ON content_posts FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all content posts"
  ON content_posts FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Team view all content posts"
  ON content_posts FOR SELECT
  USING (public.is_team_member());

-- -------------------------------------------------------
-- affiliates
-- -------------------------------------------------------
CREATE POLICY "Users view own affiliate"
  ON affiliates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own affiliate"
  ON affiliates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admin/manager manage all affiliates"
  ON affiliates FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- referrals
-- -------------------------------------------------------
CREATE POLICY "Affiliate view own referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = referrals.affiliate_id
        AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/manager manage all referrals"
  ON referrals FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- audit_logs
-- -------------------------------------------------------
CREATE POLICY "Admin view all audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Authenticated insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------
-- group_call_attendance
-- -------------------------------------------------------
CREATE POLICY "Users manage own attendance"
  ON group_call_attendance FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/manager view all attendance"
  ON group_call_attendance FOR SELECT
  USING (public.is_admin_or_manager());


-- ============================================================
-- PART 2: TIGHTEN OVERLY PERMISSIVE SCHEMA-V2 POLICIES
-- Drop "any authenticated can insert/update" and replace
-- with proper role-based access.
-- ============================================================

-- -------------------------------------------------------
-- welcome_packs (admin-only management)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON welcome_packs;
DROP POLICY IF EXISTS "Authenticated users can update" ON welcome_packs;

CREATE POLICY "Admin/manager manage welcome packs"
  ON welcome_packs FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- course_prerequisites (admin-only management)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON course_prerequisites;
DROP POLICY IF EXISTS "Authenticated users can update" ON course_prerequisites;

CREATE POLICY "Admin/manager manage course prerequisites"
  ON course_prerequisites FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- resource_library (admin-only write, all read)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON resource_library;
DROP POLICY IF EXISTS "Authenticated users can update" ON resource_library;

CREATE POLICY "Admin/manager manage resources"
  ON resource_library FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- revision_cards (admin-only write)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON revision_cards;
DROP POLICY IF EXISTS "Authenticated users can update" ON revision_cards;

CREATE POLICY "Admin/manager manage revision cards"
  ON revision_cards FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- roleplay_prospect_profiles (admin + creator manage)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON roleplay_prospect_profiles;
DROP POLICY IF EXISTS "Authenticated users can update" ON roleplay_prospect_profiles;

CREATE POLICY "Team members can create roleplay profiles"
  ON roleplay_prospect_profiles FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own roleplay profiles"
  ON roleplay_prospect_profiles FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all roleplay profiles"
  ON roleplay_prospect_profiles FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- prospect_scores (team-only write)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON prospect_scores;
DROP POLICY IF EXISTS "Authenticated users can update" ON prospect_scores;

CREATE POLICY "Team manage prospect scores"
  ON prospect_scores FOR ALL
  USING (public.is_team_member());

-- -------------------------------------------------------
-- follow_up_sequences (creator + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON follow_up_sequences;
DROP POLICY IF EXISTS "Authenticated users can update" ON follow_up_sequences;

CREATE POLICY "Team create follow-up sequences"
  ON follow_up_sequences FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own sequences"
  ON follow_up_sequences FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all sequences"
  ON follow_up_sequences FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- follow_up_tasks (team-only)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON follow_up_tasks;
DROP POLICY IF EXISTS "Authenticated users can update" ON follow_up_tasks;

CREATE POLICY "Team manage follow-up tasks"
  ON follow_up_tasks FOR ALL
  USING (public.is_team_member());

-- -------------------------------------------------------
-- whatsapp_sequences (creator + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON whatsapp_sequences;
DROP POLICY IF EXISTS "Authenticated users can update" ON whatsapp_sequences;

CREATE POLICY "Team create whatsapp sequences"
  ON whatsapp_sequences FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own whatsapp sequences"
  ON whatsapp_sequences FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all whatsapp sequences"
  ON whatsapp_sequences FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- whatsapp_messages (connection owner + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can update" ON whatsapp_messages;

CREATE POLICY "Connection owner manage messages"
  ON whatsapp_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_connections
      WHERE whatsapp_connections.id = whatsapp_messages.connection_id
        AND whatsapp_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/manager manage all whatsapp messages"
  ON whatsapp_messages FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- script_flowcharts (creator + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON script_flowcharts;
DROP POLICY IF EXISTS "Authenticated users can update" ON script_flowcharts;

CREATE POLICY "Team create flowcharts"
  ON script_flowcharts FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own flowcharts"
  ON script_flowcharts FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator delete own flowcharts"
  ON script_flowcharts FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all flowcharts"
  ON script_flowcharts FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- mind_maps (creator + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON mind_maps;
DROP POLICY IF EXISTS "Authenticated users can update" ON mind_maps;

CREATE POLICY "Team create mind maps"
  ON mind_maps FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own mind maps"
  ON mind_maps FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator delete own mind maps"
  ON mind_maps FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all mind maps"
  ON mind_maps FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- script_templates (admin-only write)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON script_templates;
DROP POLICY IF EXISTS "Authenticated users can update" ON script_templates;

CREATE POLICY "Admin/manager manage script templates"
  ON script_templates FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- video_rooms (host + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON video_rooms;
DROP POLICY IF EXISTS "Authenticated users can update" ON video_rooms;

CREATE POLICY "Team create video rooms"
  ON video_rooms FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Host manage own rooms"
  ON video_rooms FOR UPDATE
  USING (host_id = auth.uid());

CREATE POLICY "Admin/manager manage all rooms"
  ON video_rooms FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- video_room_participants (self-manage + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON video_room_participants;
DROP POLICY IF EXISTS "Authenticated users can update" ON video_room_participants;

CREATE POLICY "Users manage own participation"
  ON video_room_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own participation"
  ON video_room_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admin/manager manage all participants"
  ON video_room_participants FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- polls (creator + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON polls;
DROP POLICY IF EXISTS "Authenticated users can update" ON polls;

CREATE POLICY "Team create polls"
  ON polls FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Creator manage own polls"
  ON polls FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admin/manager manage all polls"
  ON polls FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- broadcast_messages (admin/manager only for write)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON broadcast_messages;
DROP POLICY IF EXISTS "Authenticated users can update" ON broadcast_messages;

CREATE POLICY "Admin/manager manage broadcasts"
  ON broadcast_messages FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- attribution_events (team write, admin manage)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON attribution_events;
DROP POLICY IF EXISTS "Authenticated users can update" ON attribution_events;

CREATE POLICY "Team insert attribution events"
  ON attribution_events FOR INSERT
  WITH CHECK (public.is_team_member());

CREATE POLICY "Admin/manager manage all attribution events"
  ON attribution_events FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- payment_installments (client view own, admin manage)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view" ON payment_installments;
DROP POLICY IF EXISTS "Authenticated users can insert" ON payment_installments;
DROP POLICY IF EXISTS "Authenticated users can update" ON payment_installments;

CREATE POLICY "Client view own installments"
  ON payment_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = payment_installments.contract_id
        AND contracts.client_id = auth.uid()
    )
  );

CREATE POLICY "Admin/manager manage all installments"
  ON payment_installments FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- invoices (client view own, admin manage)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update" ON invoices;

CREATE POLICY "Client view own invoices"
  ON invoices FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Admin/manager manage all invoices"
  ON invoices FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- automation_rules (admin-only)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view" ON automation_rules;
DROP POLICY IF EXISTS "Authenticated users can insert" ON automation_rules;
DROP POLICY IF EXISTS "Authenticated users can update" ON automation_rules;

CREATE POLICY "Admin/manager view automation rules"
  ON automation_rules FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Admin/manager manage automation rules"
  ON automation_rules FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- automation_executions (admin-only)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view" ON automation_executions;
DROP POLICY IF EXISTS "Authenticated users can insert" ON automation_executions;
DROP POLICY IF EXISTS "Authenticated users can update" ON automation_executions;

CREATE POLICY "Admin/manager view automation executions"
  ON automation_executions FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Admin/manager manage automation executions"
  ON automation_executions FOR ALL
  USING (public.is_admin_or_manager());

-- -------------------------------------------------------
-- marketplace_listings (entrepreneur owner + admin)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert" ON marketplace_listings;
DROP POLICY IF EXISTS "Authenticated users can update" ON marketplace_listings;

CREATE POLICY "Entrepreneur manage own listings"
  ON marketplace_listings FOR ALL
  USING (entrepreneur_id = auth.uid())
  WITH CHECK (entrepreneur_id = auth.uid());

CREATE POLICY "Admin/manager manage all listings"
  ON marketplace_listings FOR ALL
  USING (public.is_admin_or_manager());


-- ============================================================
-- PART 3: ADDITIONAL TABLES MISSING RLS
-- (from migrations that may not have had RLS)
-- ============================================================

-- dm_conversations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dm_conversations' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dm_conversations' AND policyname = 'Team view dm conversations') THEN
      EXECUTE $policy$
        CREATE POLICY "Team view dm conversations" ON dm_conversations
          FOR SELECT USING (public.is_team_member())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dm_conversations' AND policyname = 'Team manage dm conversations') THEN
      EXECUTE $policy$
        CREATE POLICY "Team manage dm conversations" ON dm_conversations
          FOR ALL USING (public.is_team_member())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dm_conversations' AND policyname = 'Admin manage all dm conversations') THEN
      EXECUTE $policy$
        CREATE POLICY "Admin manage all dm conversations" ON dm_conversations
          FOR ALL USING (public.is_admin_or_manager())
      $policy$;
    END IF;
  END IF;
END $$;

-- voice_profiles (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_profiles' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users manage own voice profile') THEN
      EXECUTE $policy$
        CREATE POLICY "Users manage own voice profile" ON voice_profiles
          FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Admin manage all voice profiles') THEN
      EXECUTE $policy$
        CREATE POLICY "Admin manage all voice profiles" ON voice_profiles
          FOR ALL USING (public.is_admin_or_manager())
      $policy$;
    END IF;
  END IF;
END $$;

-- voice_messages (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_messages' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_messages' AND policyname = 'Users manage own voice messages') THEN
      EXECUTE $policy$
        CREATE POLICY "Users manage own voice messages" ON voice_messages
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM voice_profiles
              WHERE voice_profiles.id = voice_messages.voice_profile_id
                AND voice_profiles.user_id = auth.uid()
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_messages' AND policyname = 'Admin manage all voice messages') THEN
      EXECUTE $policy$
        CREATE POLICY "Admin manage all voice messages" ON voice_messages
          FOR ALL USING (public.is_admin_or_manager())
      $policy$;
    END IF;
  END IF;
END $$;


-- ============================================================
-- PART 4: INDEXES FOR RLS PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_user_id ON deal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_user_id ON booking_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_client_id ON client_onboarding(client_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_client_id ON nps_surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_client_id ON testimonials(client_id);
CREATE INDEX IF NOT EXISTS idx_prospect_lists_created_by ON prospect_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_setter ON prospects(assigned_setter_id);
CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_id ON daily_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_created_by ON content_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_group_call_attendance_user_id ON group_call_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection_owner ON whatsapp_connections(user_id);
