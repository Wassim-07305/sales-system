-- ============================================================================
-- Booking Pages System — Migration
-- Tables: booking_pages, booking_availability, booking_exceptions,
--         booking_page_views, booking_leads
-- Alter: bookings (add booking_page_id, closer_id, date, times, call_result...)
-- RPCs: get_booking_page_by_slug, get_available_slots, capture_booking_lead,
--       create_booking_public, track_booking_page_view
-- ============================================================================

-- ─── Helper function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── booking_pages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  brand_color text DEFAULT '#7af17a',
  slot_duration integer DEFAULT 30,
  buffer_minutes integer DEFAULT 0,
  min_notice_hours integer DEFAULT 2,
  max_days_ahead integer DEFAULT 60,
  qualification_fields jsonb DEFAULT '[]'::jsonb,
  timezone text DEFAULT 'Europe/Paris',
  og_title text,
  og_description text,
  og_image_url text,
  email_visible boolean DEFAULT true,
  email_required boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_booking_pages_slug ON booking_pages(slug);
CREATE INDEX idx_booking_pages_active ON booking_pages(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE booking_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_pages_admin_all" ON booking_pages
  FOR ALL USING (is_admin_or_manager());

CREATE POLICY "booking_pages_closer_read" ON booking_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('closer', 'setter'))
  );

CREATE POLICY "booking_pages_public_read" ON booking_pages
  FOR SELECT USING (is_active = true)
  WITH CHECK (false);

-- ─── booking_availability ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  closer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_booking_avail_page ON booking_availability(booking_page_id);
CREATE INDEX idx_booking_avail_closer ON booking_availability(closer_id);

ALTER TABLE booking_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avail_admin_all" ON booking_availability
  FOR ALL USING (is_admin_or_manager());

CREATE POLICY "avail_closer_own" ON booking_availability
  FOR ALL USING (closer_id = auth.uid());

-- ─── booking_exceptions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  closer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('blocked', 'override')),
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_booking_exc_page ON booking_exceptions(booking_page_id);
CREATE INDEX idx_booking_exc_date ON booking_exceptions(exception_date);

ALTER TABLE booking_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exc_admin_all" ON booking_exceptions
  FOR ALL USING (is_admin_or_manager());

CREATE POLICY "exc_closer_own" ON booking_exceptions
  FOR ALL USING (closer_id = auth.uid());

-- ─── booking_page_views ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_views_page ON booking_page_views(booking_page_id);
CREATE INDEX idx_bp_views_date ON booking_page_views(created_at);

ALTER TABLE booking_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "views_admin_read" ON booking_page_views
  FOR SELECT USING (is_admin_or_manager());

CREATE POLICY "views_anon_insert" ON booking_page_views
  FOR INSERT WITH CHECK (true);

-- ─── booking_leads ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'booked', 'disqualified', 'lost')),
  qualification_answers jsonb DEFAULT '{}'::jsonb,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bl_page ON booking_leads(booking_page_id);
CREATE INDEX idx_bl_status ON booking_leads(status);
CREATE INDEX idx_bl_email ON booking_leads(email);

ALTER TABLE booking_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_admin_all" ON booking_leads
  FOR ALL USING (is_admin_or_manager());

CREATE POLICY "leads_closer_read_own" ON booking_leads
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "leads_anon_insert" ON booking_leads
  FOR INSERT WITH CHECK (true);

-- ─── Alter bookings table ───────────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_page_id uuid REFERENCES booking_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS qualification_answers jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS call_result text,
  ADD COLUMN IF NOT EXISTS objections text,
  ADD COLUMN IF NOT EXISTS follow_up_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_date date;

CREATE INDEX IF NOT EXISTS idx_bookings_page ON bookings(booking_page_id);
CREATE INDEX IF NOT EXISTS idx_bookings_closer ON bookings(closer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

-- Trigger: sync scheduled_at ↔ date + start_time
CREATE OR REPLACE FUNCTION sync_booking_scheduled_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.scheduled_at := (NEW.date || ' ' || NEW.start_time)::timestamptz;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_scheduled_at ON bookings;
CREATE TRIGGER trg_sync_scheduled_at
  BEFORE INSERT OR UPDATE OF date, start_time ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_scheduled_at();

-- ─── RPCs ───────────────────────────────────────────────────────────────────

-- 1) Get booking page by slug (public)
CREATE OR REPLACE FUNCTION get_booking_page_by_slug(_slug text)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id', bp.id,
    'slug', bp.slug,
    'title', bp.title,
    'description', bp.description,
    'brand_color', bp.brand_color,
    'slot_duration', bp.slot_duration,
    'buffer_minutes', bp.buffer_minutes,
    'min_notice_hours', bp.min_notice_hours,
    'max_days_ahead', bp.max_days_ahead,
    'qualification_fields', bp.qualification_fields,
    'timezone', bp.timezone,
    'og_title', bp.og_title,
    'og_description', bp.og_description,
    'og_image_url', bp.og_image_url,
    'email_visible', bp.email_visible,
    'email_required', bp.email_required,
    'created_by_name', p.full_name
  )
  FROM booking_pages bp
  LEFT JOIN profiles p ON p.id = bp.created_by
  WHERE bp.slug = _slug AND bp.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_booking_page_by_slug(text) TO anon, authenticated;

-- 2) Get available slots for a page + date (public)
CREATE OR REPLACE FUNCTION get_available_slots(_slug text, _date date)
RETURNS jsonb AS $$
DECLARE
  _page_id uuid;
  _duration integer;
  _buffer integer;
  _min_notice integer;
  _dow integer;
  _slots jsonb := '[]'::jsonb;
  _avail record;
  _slot_start time;
  _slot_end time;
  _now timestamptz := now();
BEGIN
  -- Get page config
  SELECT id, slot_duration, buffer_minutes, min_notice_hours
  INTO _page_id, _duration, _buffer, _min_notice
  FROM booking_pages
  WHERE slug = _slug AND is_active = true;

  IF _page_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  _dow := EXTRACT(DOW FROM _date)::integer;

  -- Check if entire day is blocked
  IF EXISTS (
    SELECT 1 FROM booking_exceptions
    WHERE booking_page_id = _page_id
      AND exception_date = _date
      AND type = 'blocked'
      AND closer_id IS NULL
  ) THEN RETURN '[]'::jsonb; END IF;

  -- Loop through availability slots for this day
  FOR _avail IN
    SELECT ba.closer_id, ba.start_time, ba.end_time, ba.priority
    FROM booking_availability ba
    WHERE ba.booking_page_id = _page_id
      AND ba.day_of_week = _dow
      AND ba.is_active = true
      -- Exclude closers blocked for this specific date
      AND NOT EXISTS (
        SELECT 1 FROM booking_exceptions be
        WHERE be.booking_page_id = _page_id
          AND be.exception_date = _date
          AND be.type = 'blocked'
          AND be.closer_id = ba.closer_id
      )
    ORDER BY ba.priority DESC, ba.start_time
  LOOP
    _slot_start := _avail.start_time;
    WHILE _slot_start + (_duration || ' minutes')::interval <= _avail.end_time LOOP
      _slot_end := _slot_start + (_duration || ' minutes')::interval;

      -- Check min notice
      IF (_date + _slot_start) > (_now + (_min_notice || ' hours')::interval) THEN
        -- Check no existing booking conflict
        IF NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.booking_page_id = _page_id
            AND b.date = _date
            AND b.status NOT IN ('cancelled')
            AND b.start_time < _slot_end
            AND b.end_time > _slot_start
        ) THEN
          _slots := _slots || jsonb_build_object(
            'start_time', _slot_start::text,
            'end_time', _slot_end::text,
            'closer_id', _avail.closer_id
          );
        END IF;
      END IF;

      _slot_start := _slot_start + ((_duration + _buffer) || ' minutes')::interval;
    END LOOP;
  END LOOP;

  RETURN _slots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_available_slots(text, date) TO anon, authenticated;

-- 3) Capture booking lead (public)
CREATE OR REPLACE FUNCTION capture_booking_lead(
  _page_slug text,
  _name text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _qualification jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  _page_id uuid;
  _lead_id uuid;
BEGIN
  SELECT id INTO _page_id FROM booking_pages WHERE slug = _page_slug AND is_active = true;
  IF _page_id IS NULL THEN RAISE EXCEPTION 'Page introuvable'; END IF;

  -- Upsert by email if exists
  IF _email IS NOT NULL THEN
    SELECT id INTO _lead_id FROM booking_leads
    WHERE booking_page_id = _page_id AND email = _email;
  END IF;

  IF _lead_id IS NOT NULL THEN
    UPDATE booking_leads SET
      name = _name,
      phone = COALESCE(_phone, phone),
      qualification_answers = _qualification,
      status = 'qualified',
      updated_at = now()
    WHERE id = _lead_id;
  ELSE
    INSERT INTO booking_leads (booking_page_id, name, email, phone, qualification_answers, status)
    VALUES (_page_id, _name, _email, _phone, _qualification, 'qualified')
    RETURNING id INTO _lead_id;
  END IF;

  RETURN _lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION capture_booking_lead(text, text, text, text, jsonb) TO anon, authenticated;

-- 4) Create booking (public)
CREATE OR REPLACE FUNCTION create_booking_public(
  _page_slug text,
  _lead_id uuid,
  _date date,
  _start_time time,
  _name text,
  _email text,
  _phone text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  _page record;
  _end_time time;
  _closer_id uuid;
  _booking_id uuid;
BEGIN
  SELECT id, slot_duration INTO _page
  FROM booking_pages WHERE slug = _page_slug AND is_active = true;
  IF _page.id IS NULL THEN RAISE EXCEPTION 'Page introuvable'; END IF;

  _end_time := _start_time + (_page.slot_duration || ' minutes')::interval;

  -- Pick first available closer for this slot
  SELECT ba.closer_id INTO _closer_id
  FROM booking_availability ba
  WHERE ba.booking_page_id = _page.id
    AND ba.day_of_week = EXTRACT(DOW FROM _date)::integer
    AND ba.is_active = true
    AND ba.start_time <= _start_time
    AND ba.end_time >= _end_time
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.closer_id = ba.closer_id
        AND b.date = _date
        AND b.status NOT IN ('cancelled')
        AND b.start_time < _end_time
        AND b.end_time > _start_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM booking_exceptions be
      WHERE be.closer_id = ba.closer_id
        AND be.exception_date = _date
        AND be.type = 'blocked'
    )
  ORDER BY ba.priority DESC
  LIMIT 1;

  IF _closer_id IS NULL THEN RAISE EXCEPTION 'Créneau indisponible'; END IF;

  -- Insert booking
  INSERT INTO bookings (
    prospect_name, prospect_email, prospect_phone,
    booking_page_id, closer_id, assigned_to,
    date, start_time, end_time,
    scheduled_at, slot_type, duration_minutes, status
  ) VALUES (
    _name, _email, _phone,
    _page.id, _closer_id, _closer_id,
    _date, _start_time, _end_time,
    (_date || ' ' || _start_time)::timestamptz,
    'discovery', _page.slot_duration, 'confirmed'
  ) RETURNING id INTO _booking_id;

  -- Link lead to booking
  UPDATE booking_leads SET
    booking_id = _booking_id,
    assigned_to = _closer_id,
    status = 'booked',
    updated_at = now()
  WHERE id = _lead_id;

  RETURN _booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_booking_public(text, uuid, date, time, text, text, text) TO anon, authenticated;

-- 5) Track page view (public)
CREATE OR REPLACE FUNCTION track_booking_page_view(_slug text, _referrer text DEFAULT NULL)
RETURNS void AS $$
  INSERT INTO booking_page_views (booking_page_id, referrer)
  SELECT id, _referrer FROM booking_pages WHERE slug = _slug AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_booking_page_view(text, text) TO anon, authenticated;

-- ─── Updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_pages_updated
  BEFORE UPDATE ON booking_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_booking_leads_updated
  BEFORE UPDATE ON booking_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
