-- clothing_items
CREATE INDEX ON clothing_items (user_id, is_archived, deleted_at);
CREATE INDEX ON clothing_items (user_id, type);

-- outfit_items
CREATE INDEX ON outfit_items (item_id);

-- outfits
CREATE INDEX ON outfits (user_id, created_at DESC);

-- wear_logs
CREATE INDEX ON wear_logs (user_id, worn_date DESC);

-- daily_suggestion_cache
CREATE INDEX ON daily_suggestion_cache (user_id, suggestion_date DESC);
