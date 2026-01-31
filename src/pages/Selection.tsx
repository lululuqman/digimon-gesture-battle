import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { getStarters } from '../api/digimon';
import { Digimon } from '../types';

export const Selection = () => {
  const [starters, setStarters] = useState<Digimon[]>([]);
  const [loading, setLoading] = useState(true);
  const { setPlayerDigimon, setGameState } = useGameStore();

  useEffect(() => {
    getStarters().then((data) => {
      setStarters(data);
      setLoading(false);
    });
  }, []);

  const handleSelect = (digimon: Digimon) => {
    setPlayerDigimon(digimon);
    setGameState('lobby');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <h2 className="text-3xl font-bold mb-8">Choose Your Partner</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {starters.map((digimon, index) => (
          <motion.div
            key={digimon.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleSelect(digimon)}
            className="bg-slate-800 rounded-2xl p-6 cursor-pointer border-2 border-transparent hover:border-orange-500 transition-all flex flex-col items-center shadow-xl"
          >
            <div className="w-32 h-32 mb-4 flex items-center justify-center bg-slate-700 rounded-full overflow-hidden">
              <img src={digimon.img} alt={digimon.name} className="w-24 h-24 object-contain" />
            </div>
            <h3 className="text-xl font-bold mb-1">{digimon.name}</h3>
            <span className="text-xs font-mono uppercase text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
              {digimon.level}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
