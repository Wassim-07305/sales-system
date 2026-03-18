-- Table for live session notes
CREATE TABLE IF NOT EXISTS live_session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, author_id)
);

-- RLS
ALTER TABLE live_session_notes ENABLE ROW LEVEL SECURITY;

-- Users can read their own notes
CREATE POLICY "Users can read own session notes"
  ON live_session_notes FOR SELECT
  USING (auth.uid() = author_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own session notes"
  ON live_session_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own notes
CREATE POLICY "Users can update own session notes"
  ON live_session_notes FOR UPDATE
  USING (auth.uid() = author_id);

-- Indexes
CREATE INDEX idx_live_session_notes_session ON live_session_notes(session_id);
CREATE INDEX idx_live_session_notes_author ON live_session_notes(author_id);
