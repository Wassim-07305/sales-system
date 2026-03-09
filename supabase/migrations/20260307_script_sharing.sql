CREATE TABLE IF NOT EXISTS script_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL,
  script_type text NOT NULL CHECK (script_type IN ('flowchart', 'mindmap')),
  shared_by uuid REFERENCES auth.users(id),
  shared_with uuid REFERENCES auth.users(id),
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_script_shares_script ON script_shares(script_id);
CREATE INDEX idx_script_shares_user ON script_shares(shared_with);

ALTER TABLE script_flowcharts ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;
ALTER TABLE mind_maps ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;
