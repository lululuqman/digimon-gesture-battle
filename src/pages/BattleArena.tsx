import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { CameraPiP } from '../components/battle/CameraPiP';
import { getBattleCommentary, getOpponentGesture } from '../api/gemini';
import { useSound } from '../hooks/useSound';

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
    enemyGesture,
    setGestures,
    isProcessingTurn,
    setIsProcessingTurn,
    setGameState,
    playerWinStreak,
    setPlayerWinStreak,
    battleLogs,
    addBattleLog,
    selectedStage,
    resetBattle,
    setPlayerDigimon,
    unlockGalleryArt
  } = useGameStore();

  const { playSFX } = useSound();

  const getStageBackground = () => {
    switch (selectedStage) {
      case 'volcano': return 'bg-gradient-to-b from-orange-900 via-red-900 to-slate-900';
      case 'forest': return 'bg-gradient-to-b from-green-900 via-emerald-900 to-slate-900';
      case 'cyber-space': return 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900';
      default: return 'bg-slate-900';
    }
  };

  const [turnTimer, setTurnTimer] = useState(3);
  const [matchTimer, setMatchTimer] = useState(60);
  const [battleResult, setBattleResult] = useState<'player' | 'enemy' | 'tie' | null>(null);
  const [showFinisher, setShowFinisher] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [showGo, setShowGo] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hitShake, setHitShake] = useState(0);
  const [hitFlash, setHitFlash] = useState<string | null>(null);
  const [damagePopups, setDamagePopups] = useState<{id: number, text: string, x: string, y: string, color: string, scale: number}[]>([]);

  const triggerHitEffect = (type: 'player' | 'enemy' | 'critical', value: number) => {
    // 1. Shake Effect
    setHitShake(type === 'critical' ? 20 : 10);
    setTimeout(() => setHitShake(0), 300);

    // 2. Flash Effect
    setHitFlash(type === 'critical' ? 'bg-white/80' : type === 'player' ? 'bg-red-500/30' : 'bg-white/50');
    setTimeout(() => setHitFlash(null), 150);

    // 3. Damage Popup
    const id = Date.now();
    const isCrit = type === 'critical';
    const popup = {
      id,
      text: isCrit ? `CRITICAL! ${value}` : `${value}`,
      x: type === 'player' ? '50%' : '50%',
      y: type === 'player' ? '70%' : '30%',
      color: type === 'player' ? 'text-red-500' : isCrit ? 'text-yellow-400' : 'text-white',
      scale: isCrit ? 1.5 : 1
    };

    setDamagePopups(prev => [...prev, popup]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  // Pause Menu Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (battleResult || matchTimer <= 0 || isPaused) return;

    const timer = setInterval(() => {
      setMatchTimer(prev => {
        if (prev <= 1) return 0;
        if (prev <= 11) playSFX('hover'); // Ticking sound for last 10 seconds
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [battleResult, matchTimer, isPaused]);

  useEffect(() => {
    if (matchTimer === 0 && !battleResult) {
      if (playerHP > enemyHP) {
        setBattleResult('player');
        playSFX('victory');
        if (playerDigimon) unlockGalleryArt(playerDigimon.name);
      } else if (enemyHP > playerHP) {
        setBattleResult('enemy');
        playSFX('loss');
      } else {
        setBattleResult('tie');
        playSFX('loss'); // Treat tie as loss or neutral
      }
    }
  }, [matchTimer, battleResult, playerHP, enemyHP, playerDigimon, unlockGalleryArt, playSFX]);

  useEffect(() => {
    if (turnTimer === 0) {
      playSFX('fight');
      setShowGo(true);
      const timer = setTimeout(() => setShowGo(false), 1000);
      return () => clearTimeout(timer);
    } else {
      playSFX('countdown');
      setShowGo(false);
    }
  }, [turnTimer]);

  useEffect(() => {
    if (playerHP <= 0 || enemyHP <= 0) {
      const isPlayerWin = playerHP > enemyHP;
      setBattleResult(isPlayerWin ? 'player' : 'enemy');
      playSFX(isPlayerWin ? 'victory' : 'loss');
      
      if (isPlayerWin && playerDigimon) {
        unlockGalleryArt(playerDigimon.name);
      }
    }
  }, [playerHP, enemyHP]);

  const runTurn = async () => {
    if (isProcessingTurn || !playerDigimon || !enemyDigimon || isPaused) return;
    
    setIsProcessingTurn(true);
    const enemyMove = getOpponentGesture();
    
    // 1. Showdown Phase: Reveal both gestures
    setGestures(playerGesture, enemyMove);
    setCommentary("Showdown!");
    
    // Wait for visual impact
    await new Promise(r => setTimeout(r, 1500));

    // 2. Calculation Phase
    let result: 'win' | 'loss' | 'tie' = 'tie';
    let pDmg = 0;
    let eDmg = 0;
    let newStreak = playerWinStreak;
    let isFinisher = false;

    if (playerGesture === enemyMove) {
      result = 'tie';
      // Streak breaks on tie? Let's say yes for high stakes, or keep it. 
      // User said "win streak", so usually consecutive wins. Resetting on tie.
      newStreak = 0; 
    } else if (
      (playerGesture === 'fist' && enemyMove === 'peace') ||
      (playerGesture === 'peace' && enemyMove === 'open_palm') ||
      (playerGesture === 'open_palm' && enemyMove === 'fist')
    ) {
      result = 'win';
      newStreak++;
      
      // Damage Calculation
      const baseDmg = 20;
      const streakBonus = (newStreak - 1) * 10;
      eDmg = -(baseDmg + streakBonus);

      // Finisher Trigger (e.g., 3rd win in a row or more)
      if (newStreak >= 3) {
        isFinisher = true;
        eDmg -= 30; // Massive extra damage
        setShowFinisher(true);
      }
      playSFX('damage');
      triggerHitEffect(isFinisher ? 'critical' : 'enemy', Math.abs(eDmg));
    } else if (playerGesture !== 'none') {
      result = 'loss';
      pDmg = -20; // Standard enemy damage
      newStreak = 0;
      playSFX('damage');
      triggerHitEffect('player', Math.abs(pDmg));
    } else {
        // Player did nothing
        result = 'loss';
        pDmg = -10;
        newStreak = 0;
        playSFX('loss');
        triggerHitEffect('player', Math.abs(pDmg));
    }

    setPlayerWinStreak(newStreak);

    // 3. Commentary & Updates
    const text = await getBattleCommentary(
      playerDigimon.name,
      enemyDigimon.name,
      playerGesture,
      enemyMove,
      result
    );
    
    setCommentary(isFinisher ? `FINISHER!! ${text}` : text);
    updateHP(pDmg, eDmg);
    
    addBattleLog({
      turn: turnCount,
      playerMove: playerGesture,
      enemyMove: enemyMove,
      result: result,
      message: isFinisher ? `FINISHER! ${Math.abs(eDmg)} DMG` : result === 'win' ? `${Math.abs(eDmg)} DMG` : result === 'loss' ? `-${Math.abs(pDmg)} HP` : 'Draw'
    });
    setTurnCount(prev => prev + 1);

    // Wait for reading result
    setTimeout(() => {
      setIsProcessingTurn(false);
      setTurnTimer(3);
      setShowFinisher(false);
    }, isFinisher ? 4000 : 2500); // Longer wait for finisher
  };

  useEffect(() => {
    let interval: any;
    if (!isProcessingTurn && !battleResult && !isPaused) {
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
  }, [turnTimer, isProcessingTurn, battleResult, playerGesture, isPaused]);

  if (!playerDigimon || !enemyDigimon) return null;

  return (
    <motion.div 
      animate={{ x: [0, -hitShake, hitShake, -hitShake/2, hitShake/2, 0] }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col h-screen text-white relative overflow-hidden transition-all duration-1000 ${getStageBackground()}`}
    >
      {/* Hit Flash Overlay */}
      <AnimatePresence>
        {hitFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-[100] pointer-events-none mix-blend-overlay ${hitFlash}`}
          />
        )}
      </AnimatePresence>

      {/* Damage Popups */}
      <AnimatePresence>
        {damagePopups.map(popup => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, scale: 0.5, y: popup.y }}
            animate={{ opacity: 1, scale: popup.scale, y: `calc(${popup.y} - 100px)` }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`absolute z-[100] left-1/2 -translate-x-1/2 text-6xl font-black italic tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] pointer-events-none ${popup.color}`}
            style={{ top: popup.y }}
          >
            {popup.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* System Chat / Battle Log */}
      <div className="absolute top-4 left-4 z-40 w-64 max-h-48 overflow-y-auto bg-black/50 backdrop-blur-md rounded-lg border border-slate-700 p-2 text-xs font-mono scrollbar-thin scrollbar-thumb-slate-600">
        <div className="text-slate-400 font-bold mb-2 border-b border-slate-700 pb-1 sticky top-0 bg-black/50 backdrop-blur-md">BATTLE LOG</div>
        <div className="flex flex-col gap-1">
          {battleLogs.length === 0 && <div className="text-slate-500 italic">Battle start...</div>}
          {battleLogs.map((log, i) => (
            <div key={i} className={`flex items-center gap-2 ${log.result === 'win' ? 'text-green-400' : log.result === 'loss' ? 'text-red-400' : 'text-slate-400'}`}>
              <span className="w-4 text-slate-600">{log.turn}</span>
              <span>{log.playerMove === 'fist' ? '✊' : log.playerMove === 'open_palm' ? '✋' : '✌️'}</span>
              <span className="text-slate-600">vs</span>
              <span>{log.enemyMove === 'fist' ? '✊' : log.enemyMove === 'open_palm' ? '✋' : '✌️'}</span>
              <span className="ml-auto font-bold">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Match Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <div className={`text-6xl font-black italic tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] ${
          matchTimer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
        }`}>
          {matchTimer}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-black/50 px-3 py-0.5 rounded-full backdrop-blur-sm border border-slate-700 -mt-2">
          Time
        </div>
      </div>

      {/* Enemy Move Box (Top Right) */}
      <div className="absolute top-4 right-4 z-40">
        <div className="bg-black/50 backdrop-blur-md border-2 border-slate-600 rounded-xl p-4 w-32 flex flex-col items-center gap-2 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enemy Move</span>
          <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-4xl border border-slate-600">
             <AnimatePresence mode="wait">
               {isProcessingTurn && enemyGesture !== 'none' ? (
                 <motion.span
                   key="reveal"
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="drop-shadow-lg"
                 >
                   {enemyGesture === 'fist' ? '✊' : enemyGesture === 'open_palm' ? '✋' : '✌️'}
                 </motion.span>
               ) : (
                 <motion.span
                   key="waiting"
                   animate={{ opacity: [0.5, 1, 0.5] }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                   className="text-slate-600 text-2xl font-bold"
                 >
                   ?
                 </motion.span>
               )}
             </AnimatePresence>
          </div>
          <span className={`text-xs font-bold ${
            !isProcessingTurn ? 'text-slate-500' :
            enemyGesture === 'fist' ? 'text-orange-400' : 
            enemyGesture === 'open_palm' ? 'text-green-400' : 
            'text-blue-400'
          }`}>
            {isProcessingTurn && enemyGesture !== 'none' ? (
               enemyGesture === 'fist' ? 'ROCK' : enemyGesture === 'open_palm' ? 'PAPER' : 'SCISSORS'
            ) : 'WAITING...'}
          </span>
        </div>
      </div>

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
          animate={isProcessingTurn ? { x: [0, -10, 10, 0] } : hitShake > 0 && hitFlash?.includes('bg-white') ? { x: [-10, 10, -10, 10, 0], filter: 'brightness(10)' } : { y: [0, -10, 0] }}
          transition={{ duration: hitShake > 0 ? 0.2 : isProcessingTurn ? 0.2 : 3, repeat: hitShake > 0 ? 0 : Infinity }}
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
          animate={isProcessingTurn ? { x: [0, 10, -10, 0] } : hitShake > 0 && hitFlash?.includes('bg-red') ? { x: [-10, 10, -10, 10, 0], filter: 'grayscale(100%) brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)' } : { y: [0, 10, 0] }}
          transition={{ duration: hitShake > 0 ? 0.2 : isProcessingTurn ? 0.2 : 3, repeat: hitShake > 0 ? 0 : Infinity }}
          src={playerDigimon.img}
          className="w-48 h-48 object-contain mb-16 drop-shadow-[0_20px_50px_rgba(0,100,255,0.3)]"
        />
        {/* Player Gesture Indicator (Locked In) */}
        <AnimatePresence>
          {isProcessingTurn && playerGesture !== 'none' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute left-1/4 bottom-1/3 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-full"
            >
              <span className="text-4xl">
                {playerGesture === 'fist' ? '✊' : playerGesture === 'open_palm' ? '✋' : '✌️'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

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

      {/* Streak Indicator */}
      {playerWinStreak > 1 && (
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute bottom-32 left-8 z-30"
        >
          <div className="bg-orange-600 text-white px-4 py-1 rounded-r-full font-black italic shadow-lg border-2 border-white transform -skew-x-12">
            {playerWinStreak}x COMBO!
          </div>
        </motion.div>
      )}

      {/* Finisher Overlay */}
      <AnimatePresence>
        {showFinisher && (
          <motion.div
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 2, filter: 'blur(10px)' }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 pointer-events-none"
          >
            <div className="relative">
              <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,165,0,0.8)] stroke-white stroke-2">
                FINISHER!
              </h1>
              <motion.div 
                className="absolute -inset-4 border-t-4 border-b-4 border-white/50"
                animate={{ scaleX: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn Indicator */}
      {!battleResult && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <AnimatePresence mode="wait">
            {turnTimer > 0 ? (
              <motion.div
                key={turnTimer}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-6xl font-black text-white drop-shadow-2xl"
              >
                {turnTimer}
              </motion.div>
            ) : showGo ? (
              <motion.div
                key="go"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-6xl font-black text-white drop-shadow-2xl"
              >
                GO!
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      {/* Result Overlay */}
      {battleResult && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl max-w-2xl w-full flex flex-col items-center gap-6 shadow-2xl"
          >
            <div>
              <h2 className={`text-6xl font-black mb-2 uppercase tracking-tighter ${battleResult === 'player' ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600' : 'text-slate-500'}`}>
                {battleResult === 'player' ? 'Victory!' : 'Defeat...'}
              </h2>
              <p className="text-slate-400 font-medium">
                {battleResult === 'player' ? 'Your bond with your partner grows stronger.' : 'Do not give up, Tamer!'}
              </p>
            </div>

            {/* Battle Stats */}
            <div className="flex gap-8 w-full justify-center py-4 border-y border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{turnCount - 1}</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Turns</span>
              </div>
              <div className="w-px bg-slate-700/50"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-green-400">{battleLogs.filter(l => l.result === 'win').length}</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Wins</span>
              </div>
              <div className="w-px bg-slate-700/50"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-blue-400">{battleLogs.filter(l => l.result === 'tie').length}</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Draws</span>
              </div>
            </div>

            {/* Battle Log Summary */}
            <div className="w-full bg-black/40 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-left">Battle History</h3>
              <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 space-y-2">
                {battleLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-800/30 p-2 rounded">
                    <span className="text-slate-500 font-mono w-8">#{log.turn}</span>
                    <div className="flex items-center gap-4 flex-1 justify-center">
                      <div className="flex items-center gap-2">
                         <span className={log.result === 'win' ? 'text-green-400' : log.result === 'loss' ? 'text-red-400' : 'text-slate-400'}>
                           {log.playerMove === 'fist' ? '✊' : log.playerMove === 'open_palm' ? '✋' : '✌️'}
                         </span>
                         <span className="text-xs text-slate-600">vs</span>
                         <span className="text-slate-400">
                           {log.enemyMove === 'fist' ? '✊' : log.enemyMove === 'open_palm' ? '✋' : '✌️'}
                         </span>
                      </div>
                    </div>
                    <span className={`font-bold w-20 text-right ${
                      log.result === 'win' ? 'text-green-400' : 
                      log.result === 'loss' ? 'text-red-400' : 
                      'text-slate-400'
                    }`}>
                      {log.result.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setGameState('lobby')}
                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-full font-bold text-lg tracking-wide transition-all transform hover:scale-105 border border-slate-500"
              >
                RETURN TO LOBBY
              </button>
              
              <button
                onClick={() => {
                  resetBattle();
                  setPlayerDigimon(null);
                  setGameState('selection');
                }}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-full font-black text-lg tracking-wide transition-all transform hover:scale-105 shadow-lg shadow-orange-600/20"
              >
                CHANGE DIGIMON
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Battle Guide (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-40 bg-black/60 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl max-w-[260px]">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">How to Play</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">✊</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">ROCK (Fist)</span>
              <span className="text-[10px] text-slate-500">Beats Scissors</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✋</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">PAPER (Open Palm)</span>
              <span className="text-[10px] text-slate-500">Beats Rock</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✌️</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">SCISSORS (Peace)</span>
              <span className="text-[10px] text-slate-500">Beats Paper</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-400 leading-relaxed border-t border-slate-700 pt-2 flex gap-2">
          <span className="text-yellow-400 text-xs">💡</span>
          <span>Show your gesture clearly in the camera box when the countdown ends!</span>
        </div>
      </div>

      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-6"
            >
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">PAUSED</h2>
              
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-all transform hover:scale-105"
                >
                  RESUME
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    resetBattle();
                    setMatchTimer(60);
                    setTurnTimer(3);
                    setBattleResult(null);
                    setTurnCount(1);
                  }}
                  className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-all transform hover:scale-105 border border-slate-600"
                >
                  RESTART MATCH
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    setPlayerDigimon(null);
                    setGameState('lobby');
                  }}
                  className="w-full py-4 bg-red-900/50 hover:bg-red-900/80 rounded-xl font-bold text-red-200 transition-all transform hover:scale-105 border border-red-900"
                >
                  QUIT TO LOBBY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CameraPiP />
    </motion.div>
  );
};
