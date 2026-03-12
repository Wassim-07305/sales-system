-- Add prospect_id column to bookings for linking to prospect records
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_prospect_id ON bookings(prospect_id);
