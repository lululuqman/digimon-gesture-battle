import { useGameStore } from './store/useGameStore';
import { TitleScreen } from './pages/TitleScreen';
import { Selection } from './pages/Selection';
import { Lobby } from './pages/Lobby';
import { BattleArena } from './pages/BattleArena';

function App() {
  const gameState = useGameStore((state) => state.gameState);

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {gameState === 'title' && <TitleScreen />}
      {gameState === 'selection' && <Selection />}
      {gameState === 'lobby' && <Lobby />}
      {gameState === 'battle' && <BattleArena />}
    </div>
  );
}

export default App;
