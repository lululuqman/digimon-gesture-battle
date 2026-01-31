import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { fetchDigimonByLevel } from '../api/digimon';
import { useEffect, useState } from 'react';
import { Digimon } from '../types';
import { Sparkles } from 'lucide-react';

export const Lobby = () => {
  const { playerDigimon, setEnemyDigimon, setGameState } = useGameStore();
  const [loading, setLoading] = useState(false);

  const startBattle = async () => {
    setLoading(true);
    try {
      const rookies = await fetchDigimonByLevel('Rookie');
      const randomRookie = rookies[Math.floor(Math.random() * rookies.length)];
      setEnemyDigimon(randomRookie);
      setGameState('battle');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!playerDigimon) {
    setGameState('selection');
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="absolute top-4 right-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/50 rounded-full text-yellow-500 text-sm font-bold">
          <Sparkles size={16} />
          GET PREMIUM ($1)
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-12 text-slate-400">Battle Lobby</h2>

      <div className="bg-slate-800 rounded-3xl p-8 flex flex-col items-center w-full max-w-sm shadow-2xl border border-slate-700">
        <div className="w-48 h-48 bg-slate-700 rounded-full flex items-center justify-center mb-6 overflow-hidden">
          <img src={playerDigimon.img} alt={playerDigimon.name} className="w-32 h-32 object-contain" />
        </div>
        <h3 className="text-2xl font-bold mb-2">{playerDigimon.name}</h3>
        <p className="text-orange-500 font-bold mb-8 uppercase tracking-widest">{playerDigimon.level}</p>

        <button
          onClick={startBattle}
          disabled={loading}
          className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 rounded-xl font-black text-xl transition-all shadow-lg shadow-red-900/40"
        >
          {loading ? 'PREPARING...' : 'BATTLE START'}
        </button>
      </div>
    </div>
  );
};
