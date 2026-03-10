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

CREATE INDEX idx_coaching_objectives_assignee ON coaching_objectives(assignee_id);
CREATE INDEX idx_coaching_objectives_status ON coaching_objectives(status);
CREATE INDEX idx_coaching_objectives_target_date ON coaching_objectives(target_date);

ALTER TABLE coaching_objectives ENABLE ROW LEVEL SECURITY;

-- Users can view their own objectives
CREATE POLICY "Users can view own objectives" ON coaching_objectives
  FOR SELECT USING (assignee_id = auth.uid());

-- Managers/admins can view all objectives
CREATE POLICY "Managers view all objectives" ON coaching_objectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can update progress on their own objectives
CREATE POLICY "Users can update own objectives" ON coaching_objectives
  FOR UPDATE USING (assignee_id = auth.uid());

-- Managers/admins can insert/update/delete any objectives
CREATE POLICY "Managers manage objectives" ON coaching_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

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

CREATE INDEX idx_development_plans_user ON development_plans(user_id);

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own plan
CREATE POLICY "Users manage own development plan" ON development_plans
  FOR ALL USING (user_id = auth.uid());

-- Managers/admins can view and manage all plans
CREATE POLICY "Managers manage all development plans" ON development_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
