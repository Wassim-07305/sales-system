-- ============================================================
-- Performance indexes — Sales System
-- Migration: 20260318120000_performance_indexes.sql
-- Adds missing indexes on high-traffic tables (schema.sql had 0)
-- ============================================================

-- deals (CRM core — 20-50 queries/min)
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_stage_created ON deals(assigned_to, stage_id, created_at DESC);

-- profiles (auth + contacts — every request)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_health_score ON profiles(health_score);
CREATE INDEX IF NOT EXISTS idx_profiles_matched_entrepreneur ON profiles(matched_entrepreneur_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);

-- messages (chat — channel queries + full-text search)
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- bookings (scheduling)
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_scheduled ON bookings(assigned_to, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at DESC);

-- deal_activities (audit trail)
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_created ON deal_activities(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_user_id ON deal_activities(user_id);

-- prospects (lead management)
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_setter ON prospects(assigned_setter_id);
CREATE INDEX IF NOT EXISTS idx_prospects_list_created ON prospects(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- contracts (payments)
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_deal_id ON contracts(deal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- notifications (real-time)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- community_posts (forum)
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created ON community_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type_hidden ON community_posts(type, hidden);

-- lesson_progress (academy)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed ON lesson_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_user ON lesson_progress(lesson_id, user_id);

-- booking_slots (availability)
CREATE INDEX IF NOT EXISTS idx_booking_slots_user_active ON booking_slots(user_id, is_active);

-- daily_quotas (tracking)
CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_date ON daily_quotas(user_id, date DESC);

-- client_kpis (analytics)
CREATE INDEX IF NOT EXISTS idx_client_kpis_client_date ON client_kpis(client_id, date DESC);

-- channels (communication)
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
