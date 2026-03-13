-- =============================================================================
-- seed-prerequis-tables.sql — Crée les tables manquantes avant d'exécuter seed-demo-complet.sql
-- À exécuter dans Supabase SQL Editor AVANT le seed
-- =============================================================================

-- ===== COACHING OBJECTIVES =====
CREATE TABLE IF NOT EXISTS coaching_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('calls', 'deals', 'revenue', 'skills', 'other')),
  target_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  target_date date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'overdue', 'at_risk')),
  notes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_objectives_assignee ON coaching_objectives(assignee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_objectives_status ON coaching_objectives(status);
CREATE INDEX IF NOT EXISTS idx_coaching_objectives_target_date ON coaching_objectives(target_date);

ALTER TABLE coaching_objectives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own objectives' AND tablename = 'coaching_objectives') THEN
    CREATE POLICY "Users can view own objectives" ON coaching_objectives FOR SELECT USING (assignee_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Managers view all objectives' AND tablename = 'coaching_objectives') THEN
    CREATE POLICY "Managers view all objectives" ON coaching_objectives FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own objectives' AND tablename = 'coaching_objectives') THEN
    CREATE POLICY "Users can update own objectives" ON coaching_objectives FOR UPDATE USING (assignee_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Managers manage objectives' AND tablename = 'coaching_objectives') THEN
    CREATE POLICY "Managers manage objectives" ON coaching_objectives FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
  END IF;
END $$;

-- ===== DEVELOPMENT PLANS =====
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  skills jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  resources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_development_plans_user ON development_plans(user_id);

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own development plan' AND tablename = 'development_plans') THEN
    CREATE POLICY "Users manage own development plan" ON development_plans FOR ALL USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Managers manage all development plans' AND tablename = 'development_plans') THEN
    CREATE POLICY "Managers manage all development plans" ON development_plans FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
  END IF;
END $$;

-- ===== WELCOME PACKS =====
CREATE TABLE IF NOT EXISTS welcome_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role TEXT,
  items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE welcome_packs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'welcome_packs_select' AND tablename = 'welcome_packs') THEN
    CREATE POLICY "welcome_packs_select" ON welcome_packs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'welcome_packs_manage' AND tablename = 'welcome_packs') THEN
    CREATE POLICY "welcome_packs_manage" ON welcome_packs FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- ===== AUDIT LOGS (si pas encore créée) =====
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_select' AND tablename = 'audit_logs') THEN
    CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_insert' AND tablename = 'audit_logs') THEN
    CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
