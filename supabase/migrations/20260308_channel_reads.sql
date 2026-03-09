-- F34.2: Unread & Status Tracking for chat/messaging
-- Stores the last time each user read each channel.

CREATE TABLE IF NOT EXISTS channel_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_channel_reads_user ON channel_reads(user_id);

-- Enable RLS
ALTER TABLE channel_reads ENABLE ROW LEVEL SECURITY;

-- Users can read and write only their own rows
CREATE POLICY "Users can view own channel reads"
  ON channel_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channel reads"
  ON channel_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel reads"
  ON channel_reads FOR UPDATE
  USING (auth.uid() = user_id);
