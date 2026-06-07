-- tag_status tracks tagging independently from the upload pipeline (processing_status).
-- An item is "tagged" once it has a type, which is the minimum a suggestion needs.
-- This lets tagging become an on-demand step later without coupling it to "ready".
CREATE TYPE tag_status AS ENUM ('untagged', 'tagging', 'tagged', 'tag_failed');

ALTER TABLE clothing_items
  ADD COLUMN tag_status tag_status NOT NULL DEFAULT 'untagged';

-- Backfill: existing processed items with a type are already effectively tagged.
UPDATE clothing_items
  SET tag_status = 'tagged'
  WHERE processing_status = 'ready' AND type IS NOT NULL;
