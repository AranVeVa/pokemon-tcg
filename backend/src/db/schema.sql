-- Pokémon TCG Database Schema

DROP TABLE IF EXISTS live_battles CASCADE;
DROP TABLE IF EXISTS user_battle_pass_claims CASCADE;
DROP TABLE IF EXISTS battle_pass_rewards CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS user_items CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS battles CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS user_cards CASCADE;
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'Normal' CHECK (role IN ('Normal', 'Premium', 'Admin')),
  is_verified BOOLEAN DEFAULT TRUE,
  verification_token VARCHAR(100),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP WITH TIME ZONE,
  coins INT DEFAULT 2000,
  gems INT DEFAULT 150,
  last_free_pack_claimed_at TIMESTAMP WITH TIME ZONE,
  last_daily_premium_pack_at TIMESTAMP WITH TIME ZONE,
  battle_pass_xp INT DEFAULT 1240,
  battle_pass_level INT DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pokemon_cards (
  id INT PRIMARY KEY, -- Pokédex number (1 - 151)
  name VARCHAR(100) NOT NULL,
  types TEXT[] NOT NULL,
  hp_base INT NOT NULL,
  atk_base INT NOT NULL,
  sprite_url TEXT NOT NULL,
  artwork_url TEXT NOT NULL,
  rarity VARCHAR(20) DEFAULT 'comun' CHECK (rarity IN ('comun', 'poco_comun', 'rara', 'legendario')),
  evolution_stage INT DEFAULT 1,
  evolves_from_id INT REFERENCES pokemon_cards(id) ON DELETE SET NULL,
  evolves_to_id INT REFERENCES pokemon_cards(id) ON DELETE SET NULL
);

CREATE TABLE user_cards (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  card_id INT REFERENCES pokemon_cards(id) ON DELETE CASCADE,
  level INT DEFAULT 1 CHECK (level >= 1),
  current_hp INT NOT NULL,
  max_hp INT NOT NULL,
  atk INT NOT NULL,
  def INT DEFAULT 50,
  spd INT DEFAULT 50,
  iv_percentage INT DEFAULT 85,
  moves JSONB DEFAULT '[]'::jsonb,
  is_in_team BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE items (
  item_key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  effect_type VARCHAR(50) NOT NULL, -- 'heal_flat', 'heal_percent', 'revive_percent', 'revive_full'
  effect_value INT NOT NULL,
  rarity VARCHAR(20) DEFAULT 'comun',
  icon VARCHAR(50) DEFAULT 'potion'
);

CREATE TABLE user_items (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  item_key VARCHAR(50) REFERENCES items(item_key) ON DELETE CASCADE,
  quantity INT DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE(user_id, item_key)
);

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  offered_user_card_id INT REFERENCES user_cards(id) ON DELETE CASCADE,
  requested_card_id INT REFERENCES pokemon_cards(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  friend_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE battle_pass_rewards (
  level INT PRIMARY KEY CHECK (level BETWEEN 1 AND 50),
  free_type VARCHAR(50) NOT NULL, -- 'coins', 'pack_normal', 'item', 'gems'
  free_title VARCHAR(100) NOT NULL,
  free_value JSONB NOT NULL,
  premium_type VARCHAR(50) NOT NULL, -- 'gems', 'pack_special', 'pack_legendary', 'card_guaranteed'
  premium_title VARCHAR(100) NOT NULL,
  premium_value JSONB NOT NULL
);

CREATE TABLE user_battle_pass_claims (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  level INT NOT NULL,
  track VARCHAR(10) NOT NULL CHECK (track IN ('free', 'premium')),
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, level, track)
);

CREATE TABLE battles (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  opponent_id INT REFERENCES users(id) ON DELETE SET NULL,
  opponent_name VARCHAR(100) NOT NULL,
  battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('amistoso', 'normal')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('victoria', 'derrota')),
  xp_earned INT DEFAULT 0,
  coins_earned INT DEFAULT 0,
  item_reward VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE live_battles (
  id SERIAL PRIMARY KEY,
  challenger_id INT REFERENCES users(id) ON DELETE CASCADE,
  opponent_id INT REFERENCES users(id) ON DELETE CASCADE,
  battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('amistoso', 'normal')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished', 'rejected', 'cancelled')),
  turn_user_id INT,
  turn_number INT DEFAULT 1,
  winner_id INT,
  challenger_team JSONB NOT NULL,
  opponent_team JSONB,
  challenger_active_idx INT DEFAULT 0,
  opponent_active_idx INT DEFAULT 0,
  challenger_energy INT DEFAULT 20,
  opponent_energy INT DEFAULT 20,
  challenger_shield BOOLEAN DEFAULT FALSE,
  opponent_shield BOOLEAN DEFAULT FALSE,
  challenger_atk_buff NUMERIC(4,2) DEFAULT 1.0,
  opponent_atk_buff NUMERIC(4,2) DEFAULT 1.0,
  challenger_def_buff NUMERIC(4,2) DEFAULT 1.0,
  opponent_def_buff NUMERIC(4,2) DEFAULT 1.0,
  must_switch_user_id INT,
  last_event JSONB,
  rewards JSONB,
  battle_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  stripe_session_id VARCHAR(255),
  amount_mxn NUMERIC(10,2) NOT NULL,
  product_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  customer_email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
