-- ============================================================================
-- Message Reactions (Slack-style emoji reactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON message_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add their own reactions"
  ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
