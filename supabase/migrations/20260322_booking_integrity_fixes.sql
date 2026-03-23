-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Booking integrity & performance fixes
-- Date: 2026-03-22
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. UNIQUE constraint: prevent double-booking same closer on same slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_closer_slot
  ON bookings (booking_page_id, closer_id, date, start_time)
  WHERE status NOT IN ('cancelled');

-- 2. Index on booking_leads(email) for fast upsert / lookup
CREATE INDEX IF NOT EXISTS idx_booking_leads_email
  ON booking_leads (email)
  WHERE email IS NOT NULL;

-- 3. Index on bookings(assigned_to, scheduled_at) for conflict checks
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_schedule
  ON bookings (assigned_to, scheduled_at)
  WHERE status != 'cancelled';

-- 4. Index on bookings(booking_page_id) for page-scoped queries
CREATE INDEX IF NOT EXISTS idx_bookings_page_id
  ON bookings (booking_page_id)
  WHERE booking_page_id IS NOT NULL;
