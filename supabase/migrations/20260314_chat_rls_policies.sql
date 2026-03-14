-- ============================================================================
-- Chat RLS Policies — Fix missing INSERT/UPDATE/DELETE on channels & messages
-- ============================================================================

-- CHANNELS: Add INSERT, UPDATE, DELETE policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Authenticated can create channels'
  ) THEN
    CREATE POLICY "Authenticated can create channels"
      ON channels FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Members can update channels'
  ) THEN
    CREATE POLICY "Members can update channels"
      ON channels FOR UPDATE TO authenticated
      USING (auth.uid() = created_by OR auth.uid() = ANY(members::uuid[]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Creator can delete channels'
  ) THEN
    CREATE POLICY "Creator can delete channels"
      ON channels FOR DELETE TO authenticated
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- MESSAGES: Add UPDATE and DELETE policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can edit own messages'
  ) THEN
    CREATE POLICY "Users can edit own messages"
      ON messages FOR UPDATE TO authenticated
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete own messages'
  ) THEN
    CREATE POLICY "Users can delete own messages"
      ON messages FOR DELETE TO authenticated
      USING (auth.uid() = sender_id);
  END IF;
END $$;
