-- Saved flag for outfits — powers the "Outfit da luu" collection (SavedScreen).
-- Manual (builder) outfits are saved on creation, AI-suggested outfits default to
-- unsaved until the user saves them. Orthogonal to wear/feedback, and the single
-- source of truth for the saved collection (replaces the unused saved feedback).
ALTER TABLE outfits ADD COLUMN is_saved boolean NOT NULL DEFAULT false;

-- Supports GET /api/outfits?saved=true (list a user's saved outfits).
CREATE INDEX ON outfits (user_id, is_saved);
