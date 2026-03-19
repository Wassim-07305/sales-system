-- Add missing columns to booking_pages (email_visible, email_required, og_*)
ALTER TABLE booking_pages
  ADD COLUMN IF NOT EXISTS email_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- Recreate RPC with new columns
DROP FUNCTION IF EXISTS get_booking_page_by_slug(text);

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
