-- Organisation settings (API keys, config)
CREATE TABLE IF NOT EXISTS org_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: only admins can read/write
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org_settings"
  ON org_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
