-- ===== PARTNERS (Affiliates/Partenaires) =====
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  company text NOT NULL,
  type text NOT NULL CHECK (type IN ('technology', 'consulting', 'referral')),
  commission_rate numeric NOT NULL DEFAULT 10 CHECK (commission_rate >= 0 AND commission_rate <= 50),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
  installations integer NOT NULL DEFAULT 0,
  revenue_generated numeric NOT NULL DEFAULT 0,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes text,
  contact_phone text,
  website text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_email ON partners(email);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Admins/managers can manage partners
CREATE POLICY "Admins manage partners" ON partners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ===== PARTNER PAYOUTS =====
CREATE TABLE IF NOT EXISTS partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  period text NOT NULL, -- "Mar 2026", "Fév 2026"
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_method text, -- 'bank_transfer', 'paypal', etc.
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_partner_payouts_partner ON partner_payouts(partner_id);
CREATE INDEX idx_partner_payouts_status ON partner_payouts(status);
CREATE INDEX idx_partner_payouts_period ON partner_payouts(period);

ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON partner_payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ===== PARTNER REFERRALS (tracks individual referrals) =====
CREATE TABLE IF NOT EXISTS partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text,
  referred_name text,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  deal_value numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'paid', 'expired')),
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz,
  paid_at timestamptz
);

CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_status ON partner_referrals(status);

ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referrals" ON partner_referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ===== FUNCTION: Calculate partner revenue =====
CREATE OR REPLACE FUNCTION calculate_partner_revenue(p_partner_id uuid)
RETURNS TABLE(total_revenue numeric, total_commission numeric, referral_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pr.deal_value), 0) as total_revenue,
    COALESCE(SUM(pr.commission_amount), 0) as total_commission,
    COUNT(*) as referral_count
  FROM partner_referrals pr
  WHERE pr.partner_id = p_partner_id AND pr.status IN ('converted', 'paid');
END;
$$ LANGUAGE plpgsql;
