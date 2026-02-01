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
  
  // Multiplayer State
  isMultiplayer: boolean;
  roomId: string | null;
  playerId: string;
  opponentId: string | null;

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
  setMultiplayerState: (state: { isMultiplayer: boolean; roomId: string | null; opponentId: string | null }) => void;
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

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      user: null,
      userDigimon: [],
      entitlement: null,
      gameState: 'title',
      selectedStage: 'arena',
      
      // Multiplayer defaults
      isMultiplayer: false,
      roomId: null,
      playerId: generateId(), // Persistent ID for this session
      opponentId: null,

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
      setMultiplayerState: (state) => set(state),
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
        battleLogs: [],
        commentary: "Ready to Battle?"
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
        commentary: "Ready to Battle?",
        isMultiplayer: false,
        roomId: null,
        opponentId: null
      })
    }),
    {
      name: 'digimon-battle-storage',
      partialize: (state) => ({
        // Persist only these fields
        user: state.user,
        userDigimon: state.userDigimon,
        entitlement: state.entitlement,
        encounteredDigimon: state.encounteredDigimon,
        unlockedGalleryArts: state.unlockedGalleryArts,
        playerWinStreak: state.playerWinStreak,
        // Optional: persist playerDigimon if you want to remember the last partner
        // playerDigimon: state.playerDigimon, 
      }),
    }
  )
);
