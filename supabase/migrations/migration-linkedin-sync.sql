-- Add linkedin_conversation_id to dm_conversations
ALTER TABLE dm_conversations
ADD COLUMN IF NOT EXISTS linkedin_conversation_id TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dm_conversations_linkedin_id
ON dm_conversations (linkedin_conversation_id)
WHERE linkedin_conversation_id IS NOT NULL;

-- Create linkedin_sync table
CREATE TABLE IF NOT EXISTS linkedin_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_profile_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  conversations_synced INT DEFAULT 0,
  prospects_synced INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS for linkedin_sync
ALTER TABLE linkedin_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync" ON linkedin_sync
  FOR ALL USING (auth.uid() = user_id);
