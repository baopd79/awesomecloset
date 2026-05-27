CREATE TYPE clothing_type AS ENUM (
  't_shirt', 'shirt', 'pants', 'jeans', 'shorts', 'dress', 'skirt',
  'jacket', 'coat', 'hoodie', 'sweater', 'shoes', 'sneakers', 'boots',
  'bag', 'accessory'
);

CREATE TYPE clothing_style AS ENUM (
  'casual', 'formal', 'streetwear', 'sporty', 'elegant', 'minimalist'
);

CREATE TYPE clothing_season AS ENUM ('spring_summer', 'fall_winter', 'all_season');

CREATE TYPE clothing_occasion AS ENUM ('school', 'work', 'casual', 'party', 'date', 'travel');

CREATE TYPE processing_status AS ENUM ('pending', 'removing_bg', 'tagging', 'ready', 'failed');

CREATE TYPE feedback_action AS ENUM ('saved', 'worn', 'dismissed', 'disliked');

CREATE TYPE outfit_item_role AS ENUM ('top', 'bottom', 'shoes', 'outerwear', 'bag', 'accessory');
