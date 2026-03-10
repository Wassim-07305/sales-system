-- ===== EXTENSION SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS extension_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  extension_id text NOT NULL,
  extension_name text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  price numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_extension_subscriptions_user ON extension_subscriptions(user_id);
CREATE INDEX idx_extension_subscriptions_extension ON extension_subscriptions(extension_id);
CREATE INDEX idx_extension_subscriptions_status ON extension_subscriptions(status);

ALTER TABLE extension_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions" ON extension_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins manage all subscriptions" ON extension_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ===== EXTENSION INSTALLS (tracks each install) =====
CREATE TABLE IF NOT EXISTS extension_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id text NOT NULL,
  extension_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  installed_at timestamptz DEFAULT now(),
  uninstalled_at timestamptz
);

CREATE INDEX idx_extension_installs_extension ON extension_installs(extension_id);
CREATE INDEX idx_extension_installs_user ON extension_installs(user_id);
CREATE INDEX idx_extension_installs_referrer ON extension_installs(referrer_id);

ALTER TABLE extension_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view installs" ON extension_installs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ===== COMMISSION RATES CONFIG =====
CREATE TABLE IF NOT EXISTS commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  rate numeric NOT NULL,
  rate_type text NOT NULL CHECK (rate_type IN ('fixed', 'percentage')),
  description text,
  example text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read commission rates" ON commission_rates
  FOR SELECT USING (true);

CREATE POLICY "Admins manage commission rates" ON commission_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default commission rates
INSERT INTO commission_rates (type, rate, rate_type, description, example) VALUES
  ('installation', 2.00, 'fixed', 'Commission fixe par nouvelle installation', '100 installations = 200 EUR'),
  ('monthly_subscription', 15, 'percentage', 'Pourcentage recurrent sur chaque abonnement actif', 'Client a 29 EUR/mois = 4,35 EUR/mois'),
  ('yearly_subscription', 20, 'percentage', 'Bonus pour les engagements annuels', 'Client a 290 EUR/an = 58 EUR/an'),
  ('freemium_conversion', 5.00, 'fixed', 'Bonus de conversion freemium', '50 conversions = 250 EUR'),
  ('pro_to_enterprise', 10.00, 'fixed', 'Bonus d''upsell Enterprise', '20 upsells = 200 EUR'),
  ('developer_referral', 50.00, 'fixed', 'Prime pour chaque nouveau developpeur parraine', '5 parrainages = 250 EUR')
ON CONFLICT (type) DO NOTHING;

-- ===== DEVELOPER PAYOUTS =====
CREATE TABLE IF NOT EXISTS developer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  period text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_developer_payouts_developer ON developer_payouts(developer_id);
CREATE INDEX idx_developer_payouts_status ON developer_payouts(status);

ALTER TABLE developer_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers view own payouts" ON developer_payouts
  FOR SELECT USING (developer_id = auth.uid());

CREATE POLICY "Admins manage payouts" ON developer_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
