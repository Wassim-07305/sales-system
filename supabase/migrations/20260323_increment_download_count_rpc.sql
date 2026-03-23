-- Atomic increment for resource download count
CREATE OR REPLACE FUNCTION increment_download_count(item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE resource_items
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
