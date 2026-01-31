import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export const TitleScreen = () => {
  const setGameState = useGameStore((state) => state.setGameState);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-6xl font-black mb-2 tracking-tighter bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          DIGIMON
        </h1>
        <h2 className="text-3xl font-bold mb-12 tracking-widest text-slate-400">
          GESTURE BATTLE
        </h2>
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="cursor-pointer"
        onClick={() => setGameState('selection')}
      >
        <button className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-full font-bold text-xl transition-colors shadow-lg shadow-orange-900/20">
          TAP TO START
        </button>
      </motion.div>

      <p className="mt-8 text-slate-500 text-sm animate-pulse">
        Portrait mode recommended
      </p>
    </div>
  );
};
