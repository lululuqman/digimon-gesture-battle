-- 1. User Digimon Collection
CREATE TABLE user_digimon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  digimon_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  evolution_stage TEXT DEFAULT 'rookie',
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, digimon_name)
);

-- 2. Battle History
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  player_digimon TEXT NOT NULL,
  opponent_digimon TEXT NOT NULL,
  player_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'tie')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Entitlements
CREATE TABLE user_entitlements (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'free',
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_digimon ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own digimon" ON user_digimon ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own battles" ON battles ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own entitlements" ON user_entitlements FOR SELECT USING (auth.uid() = user_id);
