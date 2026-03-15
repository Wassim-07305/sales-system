-- AI Auto-Messaging & Auto-Relance System
-- Adds relance_workflows table and extends ai_mode_configs

-- ============================================================================
-- 1. Extend ai_mode_configs with auto-send and story reaction fields
-- ============================================================================

ALTER TABLE ai_mode_configs
  ADD COLUMN IF NOT EXISTS auto_send_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_send_platforms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_send_template text DEFAULT 'Bonjour {nom}, j''ai vu votre activite autour de {activite} et j''ai trouve {dernier_post} vraiment inspirant. J''aimerais echanger avec vous !',
  ADD COLUMN IF NOT EXISTS auto_send_mode text DEFAULT 'critical_validation',
  ADD COLUMN IF NOT EXISTS story_reaction_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS story_reaction_emoji text DEFAULT '🔥';

-- ============================================================================
-- 2. Create relance_workflows table
-- ============================================================================

CREATE TABLE IF NOT EXISTS relance_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded', 'cancelled')),
  delay_j2_hours integer NOT NULL DEFAULT 48,
  delay_j3_hours integer NOT NULL DEFAULT 72,
  message_j2 text NOT NULL,
  message_j3 text NOT NULL,
  j2_sent_at timestamptz,
  j3_sent_at timestamptz,
  cancelled_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookup of pending relances
CREATE INDEX IF NOT EXISTS idx_relance_workflows_status ON relance_workflows(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_relance_workflows_prospect ON relance_workflows(prospect_id);

-- ============================================================================
-- 3. Add metadata column to inbox_messages for AI tracking
-- ============================================================================

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ============================================================================
-- 4. Add escalation columns to dm_conversations (optional — graceful if missing)
-- ============================================================================

ALTER TABLE dm_conversations
  ADD COLUMN IF NOT EXISTS needs_human boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- ============================================================================
-- 5. RLS policies for relance_workflows
-- ============================================================================

ALTER TABLE relance_workflows ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own relances
CREATE POLICY "Users can view own relances"
  ON relance_workflows FOR SELECT
  USING (auth.uid() = created_by);

-- Authenticated users can insert relances
CREATE POLICY "Users can create relances"
  ON relance_workflows FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Authenticated users can update their own relances
CREATE POLICY "Users can update own relances"
  ON relance_workflows FOR UPDATE
  USING (auth.uid() = created_by);

-- Admins/managers can view all relances
CREATE POLICY "Admins can view all relances"
  ON relance_workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
