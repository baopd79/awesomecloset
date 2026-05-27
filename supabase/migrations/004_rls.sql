-- Enable RLS
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_feedback   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_suggestion_cache ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users: own row only" ON users
  USING (id = auth.uid());

-- clothing_items
CREATE POLICY "clothing_items: own rows only" ON clothing_items
  USING (user_id = auth.uid());

-- outfits
CREATE POLICY "outfits: own rows only" ON outfits
  USING (user_id = auth.uid());

-- outfit_items — check via outfits join
CREATE POLICY "outfit_items: own rows only" ON outfit_items
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );

-- wear_logs
CREATE POLICY "wear_logs: own rows only" ON wear_logs
  USING (user_id = auth.uid());

-- suggestion_feedback
CREATE POLICY "suggestion_feedback: own rows only" ON suggestion_feedback
  USING (user_id = auth.uid());

-- push_tokens
CREATE POLICY "push_tokens: own rows only" ON push_tokens
  USING (user_id = auth.uid());

-- daily_suggestion_cache
CREATE POLICY "daily_suggestion_cache: own rows only" ON daily_suggestion_cache
  USING (user_id = auth.uid());
