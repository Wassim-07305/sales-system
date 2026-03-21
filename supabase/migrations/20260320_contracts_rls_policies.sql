-- Contracts RLS policies
-- Ensures admin and manager roles can create, view, and update contracts
-- Note: invoices and payment_installments policies already exist (migration 20260310235000)

-- Enable RLS on contracts table (idempotent)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Admin and manager can insert contracts
CREATE POLICY "Admin and manager can insert contracts"
ON contracts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Admin and manager can view all contracts
CREATE POLICY "Admin and manager can select contracts"
ON contracts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Admin and manager can update contracts
CREATE POLICY "Admin and manager can update contracts"
ON contracts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Clients can view their own contracts (signed or sent to them)
CREATE POLICY "Clients can view own contracts"
ON contracts FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
);

-- Clients can update their own contracts (for signature)
CREATE POLICY "Clients can sign own contracts"
ON contracts FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());
