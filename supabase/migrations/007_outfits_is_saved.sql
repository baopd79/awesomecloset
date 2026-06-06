-- Saved flag for outfits — powers the "Outfit đã lưu" collection (SavedScreen).
-- Manual (builder) outfits are saved on creation; AI-suggested outfits default
-- unsaved until the user taps ♥. Orthogonal to wear/feedback — single source of
-- truth for the saved collection (replaces the unused suggestion_feedback='saved').
ALTER TABLE outfits ADD COLUMN is_saved boolean NOT NULL DEFAULT false;

-- Supports GET /api/outfits?saved=true (list a user's saved outfits).
CREATE INDEX ON outfits (user_id, is_saved);
