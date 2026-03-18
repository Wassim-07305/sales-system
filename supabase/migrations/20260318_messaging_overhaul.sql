-- ============================================================
-- Migration: Messaging Overhaul (Off-Market style)
-- Ajoute channel_members, message_attachments, colonnes manquantes
-- ============================================================

-- 1. Table channel_members (remplace le champ members UUID[])
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_muted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, profile_id)
);

-- 2. Colonnes manquantes sur channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all';

-- 3. Colonnes manquantes sur messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Sync content_type from message_type for existing rows
UPDATE messages SET content_type = message_type WHERE content_type = 'text' AND message_type != 'text';

-- 4. Table message_attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Migrer les membres existants (channels.members[]) vers channel_members
DO $$
DECLARE
  ch RECORD;
  member_id UUID;
BEGIN
  FOR ch IN SELECT id, created_by, members FROM channels WHERE members IS NOT NULL AND array_length(members, 1) > 0
  LOOP
    FOREACH member_id IN ARRAY ch.members
    LOOP
      INSERT INTO channel_members (channel_id, profile_id, role)
      VALUES (ch.id, member_id, CASE WHEN member_id = ch.created_by THEN 'admin' ELSE 'member' END)
      ON CONFLICT (channel_id, profile_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Aussi migrer les channel_reads existants vers channel_members.last_read_at
DO $$
DECLARE
  cr RECORD;
BEGIN
  FOR cr IN SELECT channel_id, user_id, last_read_at FROM channel_reads
  LOOP
    UPDATE channel_members SET last_read_at = cr.last_read_at
    WHERE channel_id = cr.channel_id AND profile_id = cr.user_id;
    -- Si le membre n'existe pas dans channel_members, l'ajouter
    INSERT INTO channel_members (channel_id, profile_id, last_read_at)
    VALUES (cr.channel_id, cr.user_id, cr.last_read_at)
    ON CONFLICT (channel_id, profile_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
  END LOOP;
END $$;

-- Migrer les file_url/file_name existants en message_attachments
INSERT INTO message_attachments (message_id, file_name, file_url, file_type)
SELECT id, COALESCE(file_name, 'fichier'), file_url,
  CASE
    WHEN message_type = 'image' THEN 'image/jpeg'
    WHEN message_type = 'voice' THEN 'audio/webm'
    WHEN message_type = 'file' THEN 'application/octet-stream'
    ELSE ''
  END
FROM messages WHERE file_url IS NOT NULL AND file_url != ''
ON CONFLICT DO NOTHING;

-- 6. Index de performance
CREATE INDEX IF NOT EXISTS idx_channel_members_profile ON channel_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- 7. Trigger pour reply_count
CREATE OR REPLACE FUNCTION update_reply_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to IS NOT NULL THEN
    UPDATE messages SET reply_count = reply_count + 1 WHERE id = NEW.reply_to;
  ELSIF TG_OP = 'DELETE' AND OLD.reply_to IS NOT NULL THEN
    UPDATE messages SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.reply_to;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reply_count ON messages;
CREATE TRIGGER trg_reply_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- 8. Trigger pour last_message_at sur channels
CREATE OR REPLACE FUNCTION update_channel_last_message() RETURNS TRIGGER AS $$
BEGIN
  UPDATE channels SET last_message_at = NOW() WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_channel_last_message ON messages;
CREATE TRIGGER trg_channel_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_channel_last_message();

-- 9. RLS policies pour channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view channel members" ON channel_members;
CREATE POLICY "Users can view channel members" ON channel_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage own membership" ON channel_members;
CREATE POLICY "Users can manage own membership" ON channel_members
  FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage all members" ON channel_members;
CREATE POLICY "Admin can manage all members" ON channel_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- RLS pour message_attachments
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view attachments" ON message_attachments;
CREATE POLICY "Authenticated can view attachments" ON message_attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert attachments" ON message_attachments;
CREATE POLICY "Authenticated can insert attachments" ON message_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
