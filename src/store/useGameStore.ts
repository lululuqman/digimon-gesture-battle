import { create } from 'zustand';
import { BattleState, Digimon, Gesture, UserDigimon, UserEntitlement } from '../types';

interface GameStore {
  // User & Progression
  user: any | null;
  userDigimon: UserDigimon[];
  entitlement: UserEntitlement | null;
  
  // Battle State
  gameState: BattleState;
  playerHP: number;
  enemyHP: number;
  playerDigimon: Digimon | null;
  enemyDigimon: Digimon | null;
  commentary: string;
  playerGesture: Gesture;
  enemyGesture: Gesture;
  isProcessingTurn: boolean;
  
  // Actions
  setUser: (user: any) => void;
  setUserDigimon: (digimon: UserDigimon[]) => void;
  setEntitlement: (entitlement: UserEntitlement) => void;
  setGameState: (state: BattleState) => void;
  setPlayerDigimon: (digimon: Digimon) => void;
  setEnemyDigimon: (digimon: Digimon) => void;
  updateHP: (playerDelta: number, enemyDelta: number) => void;
  setCommentary: (text: string) => void;
  setGestures: (player: Gesture, enemy: Gesture) => void;
  setIsProcessingTurn: (isProcessing: boolean) => void;
  resetBattle: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  userDigimon: [],
  entitlement: null,
  gameState: 'title',
  playerHP: 100,
  enemyHP: 100,
  playerDigimon: null,
  enemyDigimon: null,
  commentary: "Ready to Battle?",
  playerGesture: 'none',
  enemyGesture: 'none',
  isProcessingTurn: false,

  setUser: (user) => set({ user }),
  setUserDigimon: (userDigimon) => set({ userDigimon }),
  setEntitlement: (entitlement) => set({ entitlement }),
  setGameState: (gameState) => set({ gameState }),
  setPlayerDigimon: (playerDigimon) => set({ playerDigimon }),
  setEnemyDigimon: (enemyDigimon) => set({ enemyDigimon }),
  updateHP: (p, e) => set((s) => ({ 
    playerHP: Math.max(0, s.playerHP + p), 
    enemyHP: Math.max(0, s.enemyHP + e) 
  })),
  setCommentary: (commentary) => set({ commentary }),
  setGestures: (player, enemy) => set({ playerGesture: player, enemyGesture: enemy }),
  setIsProcessingTurn: (isProcessingTurn) => set({ isProcessingTurn }),
  
  resetBattle: () => set({ 
    playerHP: 100, 
    enemyHP: 100, 
    playerGesture: 'none', 
    enemyGesture: 'none',
    isProcessingTurn: false,
    commentary: "Battle Start!"
  }),

  resetGame: () => set({
    gameState: 'title',
    playerHP: 100,
    enemyHP: 100,
    playerDigimon: null,
    enemyDigimon: null,
    playerGesture: 'none',
    enemyGesture: 'none',
    isProcessingTurn: false,
    commentary: "Ready to Battle?"
  })
}));
