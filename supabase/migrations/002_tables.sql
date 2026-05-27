CREATE TABLE users (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            text,
  display_name     text,
  avatar_url       text,
  style_preferences jsonb,
  streak_count     int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clothing_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_url     text,
  processed_url    text,
  thumbnail_url    text,
  processing_status processing_status NOT NULL DEFAULT 'pending',
  processing_error text,
  type             clothing_type,
  colors           jsonb,
  style            clothing_style[],
  season           clothing_season[],
  occasion         clothing_occasion[],
  custom_tags      text[],
  wear_count       int NOT NULL DEFAULT 0,
  last_worn_at     timestamptz,
  is_archived      bool NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  archived_at      timestamptz,
  deleted_at       timestamptz
);

CREATE TABLE outfits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text,
  collage_url      text,
  occasion         clothing_occasion,
  weather_context  jsonb,
  ai_generated     bool NOT NULL DEFAULT false,
  ai_reasoning     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outfit_items (
  outfit_id        uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id          uuid NOT NULL REFERENCES clothing_items(id) ON DELETE RESTRICT,
  position         int NOT NULL DEFAULT 0,
  role             outfit_item_role NOT NULL,
  PRIMARY KEY (outfit_id, item_id)
);

CREATE TABLE wear_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id        uuid NOT NULL REFERENCES outfits(id),
  worn_date        date NOT NULL DEFAULT CURRENT_DATE,
  items_snapshot   jsonb NOT NULL,
  rating           int CHECK (rating BETWEEN 1 AND 5),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suggestion_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id        uuid NOT NULL REFERENCES outfits(id),
  action           feedback_action NOT NULL,
  rating           int CHECK (rating BETWEEN 1 AND 5),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE push_tokens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token  text NOT NULL UNIQUE,
  platform         text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_suggestion_cache (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_date  date NOT NULL,
  context_hash     text NOT NULL,
  outfit_ids       uuid[] NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, suggestion_date, context_hash)
);

-- Auto-create users row on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
