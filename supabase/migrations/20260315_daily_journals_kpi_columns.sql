-- Add KPI tracking columns to daily_journals for setter performance monitoring
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS dms_sent INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS replies_received INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS calls_booked INT DEFAULT 0;
ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS deals_closed INT DEFAULT 0;
