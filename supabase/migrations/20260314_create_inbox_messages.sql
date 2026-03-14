-- Migration: Create inbox_messages table for unified messaging tracking
-- Apply via Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'instagram', 'sms')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'queued')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_messages_contact ON public.inbox_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_user ON public.inbox_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_channel ON public.inbox_messages(channel, created_at DESC);

-- RLS
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_messages_admin_all" ON public.inbox_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "inbox_messages_own" ON public.inbox_messages
  FOR ALL USING (user_id = auth.uid());
