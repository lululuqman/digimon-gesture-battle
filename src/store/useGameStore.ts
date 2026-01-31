import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BattleState, Digimon, Gesture, UserDigimon, UserEntitlement } from '../types';

export interface BattleLogEntry {
  turn: number;
  playerMove: Gesture;
  enemyMove: Gesture;
  result: 'win' | 'loss' | 'tie';
  message: string;
}

export type BattleStage = 'cyber-space' | 'volcano' | 'forest' | 'arena';

interface GameStore {
  // User & Progression
  user: any | null;
  userDigimon: UserDigimon[];
  entitlement: UserEntitlement | null;
  
  // Battle State
  gameState: BattleState;
  selectedStage: BattleStage;
  playerHP: number;
  enemyHP: number;
  playerDigimon: Digimon | null;
  enemyDigimon: Digimon | null;
  commentary: string;
  playerGesture: Gesture;
  enemyGesture: Gesture;
  isProcessingTurn: boolean;
  playerWinStreak: number;
  battleLogs: BattleLogEntry[];
  encounteredDigimon: string[];
  unlockedGalleryArts: string[];
  
  // Actions
  setUser: (user: any) => void;
  setUserDigimon: (digimon: UserDigimon[]) => void;
  setEntitlement: (entitlement: UserEntitlement) => void;
  setGameState: (state: BattleState) => void;
  setSelectedStage: (stage: BattleStage) => void;
  setPlayerDigimon: (digimon: Digimon | null) => void;
  setEnemyDigimon: (digimon: Digimon | null) => void;
  updateHP: (playerDelta: number, enemyDelta: number) => void;
  setCommentary: (text: string) => void;
  setGestures: (player: Gesture, enemy: Gesture) => void;
  setPlayerGesture: (gesture: Gesture) => void;
  setIsProcessingTurn: (isProcessing: boolean) => void;
  setPlayerWinStreak: (streak: number) => void;
  addBattleLog: (entry: BattleLogEntry) => void;
  unlockDigimon: (digimonName: string) => void;
  unlockGalleryArt: (digimonName: string) => void;
  resetBattle: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      user: null,
      userDigimon: [],
      entitlement: null,
      gameState: 'title',
      selectedStage: 'arena',
      playerHP: 100,
      enemyHP: 100,
      playerDigimon: null,
      enemyDigimon: null,
      commentary: "Ready to Battle?",
      playerGesture: 'none',
      enemyGesture: 'none',
      isProcessingTurn: false,
      playerWinStreak: 0,
      battleLogs: [],
      encounteredDigimon: [],
      unlockedGalleryArts: [],

      setUser: (user) => set({ user }),
      setUserDigimon: (userDigimon) => set({ userDigimon }),
      setEntitlement: (entitlement) => set({ entitlement }),
      setGameState: (gameState) => set({ gameState }),
      setSelectedStage: (selectedStage) => set({ selectedStage }),
      setPlayerDigimon: (playerDigimon) => set({ playerDigimon }),
      setEnemyDigimon: (enemyDigimon) => set({ enemyDigimon }),
      updateHP: (p, e) => set((s) => ({ 
        playerHP: Math.max(0, s.playerHP + p), 
        enemyHP: Math.max(0, s.enemyHP + e) 
      })),
      setCommentary: (commentary) => set({ commentary }),
      setGestures: (player, enemy) => set({ playerGesture: player, enemyGesture: enemy }),
      setPlayerGesture: (gesture) => set({ playerGesture: gesture }),
      setIsProcessingTurn: (isProcessingTurn) => set({ isProcessingTurn }),
      setPlayerWinStreak: (streak) => set({ playerWinStreak: streak }),
      addBattleLog: (entry) => set((s) => ({ battleLogs: [entry, ...s.battleLogs] })),
      unlockDigimon: (name) => set((s) => ({ 
        encounteredDigimon: s.encounteredDigimon.includes(name) ? s.encounteredDigimon : [...s.encounteredDigimon, name] 
      })),
      unlockGalleryArt: (name) => set((s) => ({ 
        unlockedGalleryArts: s.unlockedGalleryArts.includes(name) ? s.unlockedGalleryArts : [...s.unlockedGalleryArts, name] 
      })),
      
      resetBattle: () => set({ 
        playerHP: 100, 
        enemyHP: 100, 
        playerGesture: 'none', 
        enemyGesture: 'none',
        isProcessingTurn: false,
        playerWinStreak: 0,
        battleLogs: [],
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
        playerWinStreak: 0,
        battleLogs: [],
        commentary: "Ready to Battle?"
      })
    }),
    {
      name: 'digimon-game-storage',
      partialize: (state) => ({ 
        encounteredDigimon: state.encounteredDigimon,
        unlockedGalleryArts: state.unlockedGalleryArts,
        userDigimon: state.userDigimon,
        playerWinStreak: state.playerWinStreak
      }),
    }
  )
);
