-- ============================================================================
-- Fix RLS policies for channels & channel_members
-- Run this in the Supabase SQL Editor if channels can't be created
-- ============================================================================

-- CHANNELS: Ensure INSERT policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Authenticated can insert channels'
  ) THEN
    CREATE POLICY "Authenticated can insert channels" ON channels
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- CHANNELS: Ensure UPDATE policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Owner or staff can update channels'
  ) THEN
    CREATE POLICY "Owner or staff can update channels" ON channels
      FOR UPDATE TO authenticated
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- CHANNELS: Ensure DELETE policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Owner or staff can delete channels'
  ) THEN
    CREATE POLICY "Owner or staff can delete channels" ON channels
      FOR DELETE TO authenticated
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- CHANNEL_MEMBERS: Ensure table exists and has RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_members') THEN
    ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- CHANNEL_MEMBERS: SELECT policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_members' AND policyname = 'Users can view channel members'
  ) THEN
    CREATE POLICY "Users can view channel members" ON channel_members
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- CHANNEL_MEMBERS: Users can manage own membership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_members' AND policyname = 'Users can manage own membership'
  ) THEN
    CREATE POLICY "Users can manage own membership" ON channel_members
      FOR ALL USING (profile_id = auth.uid());
  END IF;
END $$;

-- CHANNEL_MEMBERS: Admin/manager can manage all members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_members' AND policyname = 'Admin can manage all members'
  ) THEN
    CREATE POLICY "Admin can manage all members" ON channel_members
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      );
  END IF;
END $$;

-- MESSAGES: Ensure INSERT policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated can send messages'
  ) THEN
    CREATE POLICY "Authenticated can send messages" ON messages
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

-- Verify: list all policies for channels and channel_members
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('channels', 'channel_members', 'messages')
ORDER BY tablename, policyname;
