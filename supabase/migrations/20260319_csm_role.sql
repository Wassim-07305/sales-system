-- CSM Role: kick-cases and feedbacks tables

-- Kick-cases: track client issues handled by CSM
CREATE TABLE IF NOT EXISTS csm_kickcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('blocage_technique', 'manque_motivation', 'probleme_resultats', 'autre')),
  description TEXT NOT NULL,
  action_entreprise TEXT,
  status TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'en_cours', 'resolu')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks terrain: feedback from CSM to admin
CREATE TABLE IF NOT EXISTS csm_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id UUID NOT NULL REFERENCES profiles(id),
  source_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('formation', 'crm', 'communaute', 'processus', 'autre')),
  feedback TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'moyenne' CHECK (priority IN ('faible', 'moyenne', 'haute')),
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'transmis', 'pris_en_compte')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE csm_kickcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE csm_feedbacks ENABLE ROW LEVEL SECURITY;

-- CSM can manage their own kick-cases
CREATE POLICY "CSM manage own kickcases" ON csm_kickcases FOR ALL TO authenticated
  USING (auth.uid() = csm_id) WITH CHECK (auth.uid() = csm_id);
-- Admins see all kick-cases
CREATE POLICY "Admins view all kickcases" ON csm_kickcases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- CSM can manage their own feedbacks
CREATE POLICY "CSM manage own feedbacks" ON csm_feedbacks FOR ALL TO authenticated
  USING (auth.uid() = csm_id) WITH CHECK (auth.uid() = csm_id);
-- Admins see all feedbacks
CREATE POLICY "Admins manage all feedbacks" ON csm_feedbacks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_csm_kickcases_csm ON csm_kickcases(csm_id);
CREATE INDEX IF NOT EXISTS idx_csm_kickcases_client ON csm_kickcases(client_id);
CREATE INDEX IF NOT EXISTS idx_csm_kickcases_status ON csm_kickcases(status);
CREATE INDEX IF NOT EXISTS idx_csm_feedbacks_csm ON csm_feedbacks(csm_id);
CREATE INDEX IF NOT EXISTS idx_csm_feedbacks_status ON csm_feedbacks(status);
