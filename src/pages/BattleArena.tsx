import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { CameraPiP } from '../components/battle/CameraPiP';
import { getBattleCommentary, getOpponentGesture } from '../api/gemini';
import { Gesture } from '../types';

export const BattleArena = () => {
  const {
    playerDigimon,
    enemyDigimon,
    playerHP,
    enemyHP,
    updateHP,
    commentary,
    setCommentary,
    playerGesture,
    setGestures,
    isProcessingTurn,
    setIsProcessingTurn,
    setGameState
  } = useGameStore();

  const [turnTimer, setTurnTimer] = useState(3);
  const [battleResult, setBattleResult] = useState<'player' | 'enemy' | 'tie' | null>(null);

  useEffect(() => {
    if (playerHP <= 0 || enemyHP <= 0) {
      setBattleResult(playerHP > enemyHP ? 'player' : 'enemy');
    }
  }, [playerHP, enemyHP]);

  const runTurn = async () => {
    if (isProcessingTurn || !playerDigimon || !enemyDigimon) return;
    
    setIsProcessingTurn(true);
    const enemyMove = getOpponentGesture();
    setGestures(playerGesture, enemyMove);

    // RPS Logic: Fist > Peace > Open Palm > Fist
    let result = 'tie';
    let pDmg = 0;
    let eDmg = 0;

    if (playerGesture === enemyMove) {
      result = 'tie';
    } else if (
      (playerGesture === 'fist' && enemyMove === 'peace') ||
      (playerGesture === 'peace' && enemyMove === 'open_palm') ||
      (playerGesture === 'open_palm' && enemyMove === 'fist')
    ) {
      result = 'win';
      eDmg = -20;
    } else if (playerGesture !== 'none') {
      result = 'loss';
      pDmg = -20;
    }

    const text = await getBattleCommentary(
      playerDigimon.name,
      enemyDigimon.name,
      playerGesture,
      enemyMove,
      result
    );
    
    setCommentary(text);
    updateHP(pDmg, eDmg);
    
    setTimeout(() => {
      setIsProcessingTurn(false);
      setTurnTimer(3);
    }, 2000);
  };

  useEffect(() => {
    let interval: any;
    if (!isProcessingTurn && !battleResult) {
      interval = setInterval(() => {
        setTurnTimer((prev) => {
          if (prev <= 1) {
            runTurn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [turnTimer, isProcessingTurn, battleResult, playerGesture]);

  if (!playerDigimon || !enemyDigimon) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Enemy Side */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 bg-gradient-to-b from-red-900/20 to-transparent">
        <div className="w-full px-8 mb-4">
          <div className="flex justify-between mb-1">
            <span className="font-bold">{enemyDigimon.name}</span>
            <span className="font-mono">{enemyHP}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <motion.div 
              className="h-full bg-red-500"
              initial={{ width: '100%' }}
              animate={{ width: `${enemyHP}%` }}
            />
          </div>
        </div>
        <motion.img
          animate={isProcessingTurn ? { x: [0, -10, 10, 0] } : { y: [0, -10, 0] }}
          transition={{ duration: isProcessingTurn ? 0.2 : 3, repeat: Infinity }}
          src={enemyDigimon.img}
          className="w-48 h-48 object-contain"
        />
      </div>

      {/* Commentary Box */}
      <div className="h-24 bg-slate-800/80 backdrop-blur-md flex items-center justify-center px-6 text-center border-y border-slate-700">
        <p className="text-lg font-medium italic text-orange-400">"{commentary}"</p>
      </div>

      {/* Player Side */}
      <div className="flex-1 flex flex-col items-center justify-end pb-24 bg-gradient-to-t from-blue-900/20 to-transparent">
        <motion.img
          animate={isProcessingTurn ? { x: [0, 10, -10, 0] } : { y: [0, 10, 0] }}
          transition={{ duration: isProcessingTurn ? 0.2 : 3, repeat: Infinity }}
          src={playerDigimon.img}
          className="w-48 h-48 object-contain"
        />
        <div className="w-full px-8 mt-4">
          <div className="flex justify-between mb-1">
            <span className="font-bold">{playerDigimon.name}</span>
            <span className="font-mono">{playerHP}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: '100%' }}
              animate={{ width: `${playerHP}%` }}
            />
          </div>
        </div>
      </div>

      {/* Turn Indicator */}
      {!battleResult && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={turnTimer}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="text-6xl font-black text-white drop-shadow-2xl"
            >
              {turnTimer > 0 ? turnTimer : "GO!"}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Result Overlay */}
      {battleResult && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-50 p-8 text-center">
          <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">
            {battleResult === 'player' ? 'Victory!' : 'Defeat...'}
          </h2>
          <p className="text-slate-400 mb-8">
            {battleResult === 'player' ? 'Your bond with your partner grows stronger.' : 'Do not give up, Tamer!'}
          </p>
          <button
            onClick={() => setGameState('lobby')}
            className="px-12 py-4 bg-orange-600 rounded-full font-bold text-xl"
          >
            RETURN TO LOBBY
          </button>
        </div>
      )}

      <CameraPiP />
    </div>
  );
};
