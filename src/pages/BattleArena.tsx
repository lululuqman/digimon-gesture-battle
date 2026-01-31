import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { CameraPiP } from '../components/battle/CameraPiP';
import { getBattleCommentary, getOpponentGesture } from '../api/gemini';

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
      <div className="flex-1 flex flex-col items-center justify-start pt-12 bg-gradient-to-b from-red-900/20 to-transparent relative">
        {/* Enemy HP Bar - Stylized */}
        <div className="absolute top-8 left-8 right-8 max-w-md mx-auto z-20">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end px-2">
              <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-1 rounded-t-xl border-t border-x border-slate-600">
                <span className="font-black italic text-sm tracking-tighter text-white uppercase">{enemyDigimon.name}</span>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-t-lg border-t border-x border-slate-600 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">LV.99</span>
                <span className="font-mono text-xs font-bold text-red-400">{enemyHP}/100</span>
              </div>
            </div>
            <div className="h-6 bg-slate-900/80 rounded-sm border-2 border-slate-600 overflow-hidden relative skew-x-[-12deg] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              {/* HP Background Grid */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.5)_95%)] bg-[length:20px_100%]"></div>
              {/* Damage Delay Bar */}
              <motion.div 
                className="absolute inset-y-0 left-0 bg-white/30"
                initial={{ width: '100%' }}
                animate={{ width: `${enemyHP}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              {/* Actual HP Bar */}
              <motion.div 
                className={`h-full transition-colors duration-500 ${
                  enemyHP > 50 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                  enemyHP > 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                  'bg-gradient-to-r from-red-500 to-red-700 animate-pulse'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${enemyHP}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            </div>
          </div>
        </div>

        <motion.img
          animate={isProcessingTurn ? { x: [0, -10, 10, 0] } : { y: [0, -10, 0] }}
          transition={{ duration: isProcessingTurn ? 0.2 : 3, repeat: Infinity }}
          src={enemyDigimon.img}
          className="w-48 h-48 object-contain mt-16 drop-shadow-[0_20px_50px_rgba(255,0,0,0.3)]"
        />
      </div>

      {/* Commentary Box */}
      <div className="h-24 bg-slate-800/80 backdrop-blur-md flex items-center justify-center px-6 text-center border-y border-slate-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:10px_10px]"></div>
        <p className="text-lg font-medium italic text-orange-400 drop-shadow-sm z-10">"{commentary}"</p>
      </div>

      {/* Player Side */}
      <div className="flex-1 flex flex-col items-center justify-end pb-24 bg-gradient-to-t from-blue-900/20 to-transparent relative">
        <motion.img
          animate={isProcessingTurn ? { x: [0, 10, -10, 0] } : { y: [0, 10, 0] }}
          transition={{ duration: isProcessingTurn ? 0.2 : 3, repeat: Infinity }}
          src={playerDigimon.img}
          className="w-48 h-48 object-contain mb-16 drop-shadow-[0_20px_50px_rgba(0,100,255,0.3)]"
        />

        {/* Player HP Bar - Stylized */}
        <div className="absolute bottom-8 left-8 right-8 max-w-md mx-auto z-20">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end px-2">
              <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-1 rounded-t-xl border-t border-x border-slate-600">
                <span className="font-black italic text-sm tracking-tighter text-white uppercase">{playerDigimon.name}</span>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-t-lg border-t border-x border-slate-600 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PLAYER</span>
                <span className="font-mono text-xs font-bold text-blue-400">{playerHP}/100</span>
              </div>
            </div>
            <div className="h-6 bg-slate-900/80 rounded-sm border-2 border-slate-600 overflow-hidden relative skew-x-[12deg] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              {/* HP Background Grid */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.5)_95%)] bg-[length:20px_100%]"></div>
              {/* Damage Delay Bar */}
              <motion.div 
                className="absolute inset-y-0 left-0 bg-white/30"
                initial={{ width: '100%' }}
                animate={{ width: `${playerHP}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              {/* Actual HP Bar */}
              <motion.div 
                className={`h-full transition-colors duration-500 ${
                  playerHP > 50 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
                  playerHP > 20 ? 'bg-gradient-to-r from-cyan-400 to-cyan-600' : 
                  'bg-gradient-to-r from-red-500 to-red-700 animate-pulse'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${playerHP}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            </div>
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
