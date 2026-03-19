-- ESOP Submissions table
-- Stores ESOP documents submitted by B2B entrepreneurs for validation by admin
CREATE TABLE IF NOT EXISTS esop_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  entrepreneur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'soumis', 'en_revision', 'valide')),
  content JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  revision_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entrepreneur_id)
);

-- RLS
ALTER TABLE esop_submissions ENABLE ROW LEVEL SECURITY;

-- Entrepreneurs can manage their own ESOP
CREATE POLICY "Entrepreneurs manage own esop" ON esop_submissions FOR ALL TO authenticated
  USING (auth.uid() = entrepreneur_id) WITH CHECK (auth.uid() = entrepreneur_id);

-- Admins/managers can view and update all ESOPs
CREATE POLICY "Admins manage all esops" ON esop_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'csm')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_esop_entrepreneur ON esop_submissions(entrepreneur_id);
CREATE INDEX IF NOT EXISTS idx_esop_status ON esop_submissions(status);
