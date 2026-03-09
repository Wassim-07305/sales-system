CREATE TABLE IF NOT EXISTS feedback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES auth.users(id) NOT NULL,
  member_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('feedback', 'coaching', 'review')),
  title text NOT NULL,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  action_items jsonb DEFAULT '[]',
  deal_id uuid,
  call_id uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_feedback_manager ON feedback_sessions(manager_id);
CREATE INDEX idx_feedback_member ON feedback_sessions(member_id);
