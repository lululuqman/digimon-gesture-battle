import { useGameStore } from './store/useGameStore';
import { TitleScreen } from './pages/TitleScreen';
import { Selection } from './pages/Selection';
import { Lobby } from './pages/Lobby';
import { BattleArena } from './pages/BattleArena';
import { useSound } from './hooks/useSound';
import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

function App() {
  const gameState = useGameStore((state) => state.gameState);
  const { playBGM, isReady, toggleMute, isMuted } = useSound();

  useEffect(() => {
    if (isReady) {
      if (gameState === 'battle') {
        playBGM('battle');
      } else {
        playBGM('lobby');
      }
    }
  }, [gameState, isReady, playBGM]);

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden relative">
      {/* Global Mute Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="fixed top-4 right-4 z-50 p-2 bg-slate-800/80 backdrop-blur rounded-full text-white hover:bg-slate-700 transition-colors border border-slate-600"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {gameState === 'title' && <TitleScreen />}
      {gameState === 'selection' && <Selection />}
      {gameState === 'lobby' && <Lobby />}
      {gameState === 'battle' && <BattleArena />}
    </div>
  );
}

export default App;
