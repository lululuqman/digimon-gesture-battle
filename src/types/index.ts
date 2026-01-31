export type Digimon = {
  name: string;
  img: string;
  level: string;
};

export type UserDigimon = {
  id: string;
  user_id: string;
  digimon_name: string;
  level: number;
  xp: number;
  wins: number;
  evolution_stage: 'rookie' | 'champion' | 'ultimate' | 'mega';
  unlocked_at: string;
};

export type BattleState = 'title' | 'selection' | 'lobby' | 'battle' | 'result';

export type Gesture = 'fist' | 'open_palm' | 'swipe' | 'peace' | 'none';

export type BattleResult = 'win' | 'loss' | 'tie';

export type BattleRecord = {
  id: string;
  user_id: string;
  player_digimon: string;
  opponent_digimon: string;
  player_score: number;
  opponent_score: number;
  result: BattleResult;
  created_at: string;
};

export type UserEntitlement = {
  user_id: string;
  product_id: 'free' | 'full_app';
  active: boolean;
  updated_at: string;
};
