import { useGameStore, BattleStage } from '../store/useGameStore';
import { fetchDigimonByLevel } from '../api/digimon';
import { Digimon } from '../types';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Swords, Users, Image as ImageIcon, Map, Trophy, Lock, Download, X } from 'lucide-react';
import { createCheckoutSession } from '../api/stripe';

const STAGES: { id: BattleStage; name: string; color: string; desc: string }[] = [
  { id: 'arena', name: 'Digital Arena', color: 'from-slate-800 to-slate-900', desc: 'Standard battleground.' },
  { id: 'volcano', name: 'Lava Zone', color: 'from-orange-900 to-red-900', desc: 'Intense heat boosts fire moves.' },
  { id: 'forest', name: 'Pixel Forest', color: 'from-green-900 to-emerald-900', desc: 'Dense data foliage.' },
  { id: 'cyber-space', name: 'Cyber Space', color: 'from-indigo-900 to-purple-900', desc: 'The core of the network.' },
];

const GalleryCardView = ({ digimon, onClose }: { digimon: Digimon; onClose: () => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [15, -15]);
  const rotateY = useTransform(x, [-200, 200], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = digimon.img;
    link.download = `${digimon.name}-Mastered.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
    >
      <div className="relative perspective-1000" onClick={(e) => e.stopPropagation()}>
         <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full"
        >
          <X size={24} />
        </button>

        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { x.set(0); y.set(0); }}
          className="relative w-[350px] h-[500px] bg-slate-900 border-4 border-yellow-500 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center group cursor-grab active:cursor-grabbing"
        >
          {/* Holographic Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.3)_25%,transparent_30%)] z-20 pointer-events-none mix-blend-overlay opacity-50 transition-opacity group-hover:opacity-80"></div>
          
          {/* Content */}
          <div className="flex-1 w-full relative flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20">
             <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/20 to-slate-900"></div>
             <motion.img 
               src={digimon.img} 
               alt={digimon.name} 
               className="w-64 h-64 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
               style={{ translateZ: 50 }}
             />
             <div className="absolute top-4 right-4 z-10">
               <Trophy className="text-yellow-400 drop-shadow-lg" size={32} />
             </div>
          </div>

          <div className="w-full bg-slate-900 p-6 border-t border-yellow-500/30 relative z-10 flex flex-col items-center gap-4">
            <div className="text-center">
              <h2 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-1">{digimon.name}</h2>
              <span className="text-xs font-bold text-yellow-700 uppercase tracking-[0.3em]">MASTERED ART</span>
            </div>

            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95 w-full justify-center"
            >
              <Download size={18} />
              DOWNLOAD ART
            </button>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
             <p className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">
               Hover over card for 3D effect
             </p>
        </div>
      </div>
    </motion.div>
  );
};

export const Lobby = () => {
  const { playerDigimon, setPlayerDigimon, setEnemyDigimon, setGameState, selectedStage, setSelectedStage, encounteredDigimon, unlockDigimon, unlockedGalleryArts, resetBattle } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [galleryDigimon, setGalleryDigimon] = useState<Digimon[]>([]);
  const [activeView, setActiveView] = useState<'menu' | 'stages' | 'gallery' | 'digidex'>('menu');
  const [viewingDigimon, setViewingDigimon] = useState<Digimon | null>(null);
  const [viewingGalleryItem, setViewingGalleryItem] = useState<Digimon | null>(null);

  useEffect(() => {
    if ((activeView === 'gallery' || activeView === 'digidex') && galleryDigimon.length === 0) {
      const loadGallery = async () => {
        try {
          const rookies = await fetchDigimonByLevel('Rookie');
          const champions = await fetchDigimonByLevel('Champion');
          setGalleryDigimon([...rookies, ...champions].slice(0, 20)); // Limit to 20 for now
        } catch (e) {
          console.error("Failed to load gallery", e);
        }
      };
      loadGallery();
    }
  }, [activeView]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) alert('Payment successful! Premium features unlocked (simulation).');
    if (query.get('canceled')) alert('Payment canceled.');
  }, []);

  const startBattle = async () => {
    setLoading(true);
    try {
      resetBattle();
      const rookies = await fetchDigimonByLevel('Rookie');
      const randomRookie = rookies[Math.floor(Math.random() * rookies.length)];
      setEnemyDigimon(randomRookie);
      unlockDigimon(randomRookie.name);
      if (playerDigimon) unlockDigimon(playerDigimon.name);
      setGameState('battle');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePremiumClick = () => {
    const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK; 
    createCheckoutSession(PAYMENT_LINK);
  };

  if (!playerDigimon) {
    setGameState('selection');
    return null;
  }

  return (
    <div className={`flex flex-col items-center min-h-screen text-white p-4 relative overflow-hidden transition-all duration-700 bg-gradient-to-br ${STAGES.find(s => s.id === selectedStage)?.color || 'from-slate-900 to-black'}`}>
      
      {/* Background Particles/Grid Effect */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

      {/* Top Bar */}
      <div className="w-full max-w-6xl flex justify-between items-center z-10 mb-8">
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-black italic text-xl shadow-lg">D</div>
           <span className="font-bold text-xl tracking-tighter italic opacity-80">DIGI-BATTLE</span>
        </div>
        <button 
          onClick={handlePremiumClick}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/50 rounded-full text-yellow-500 text-xs font-bold hover:bg-yellow-500/20 transition-colors backdrop-blur-sm"
        >
          <Sparkles size={14} />
          PREMIUM ($1)
        </button>
      </div>

      <div className="flex-1 w-full max-w-6xl flex flex-col md:flex-row gap-8 items-center justify-center z-10">
        
        {/* Left: Player Card */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => {
            setPlayerDigimon(null);
            setGameState('selection');
          }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center w-full max-w-sm shadow-2xl relative group cursor-pointer hover:border-orange-500/50 hover:bg-black/60 transition-all"
        >
          <div className="absolute top-4 right-4 bg-slate-800/80 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500 transition-colors">
            Change Partner
          </div>
          <div className="w-64 h-64 relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent rounded-full blur-xl group-hover:bg-orange-500/30 transition-all duration-500"></div>
            <img src={playerDigimon.img} alt={playerDigimon.name} className="w-full h-full object-contain drop-shadow-2xl relative z-10 transform group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h3 className="text-4xl font-black italic tracking-tighter mb-1">{playerDigimon.name}</h3>
          <p className="text-orange-400 font-bold mb-8 uppercase tracking-widest text-sm">{playerDigimon.level}</p>
          
          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs font-mono text-slate-400 bg-black/20 p-4 rounded-xl border border-white/5">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] uppercase">HP</span>
               <span className="text-white font-bold text-lg">1000</span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[10px] uppercase">Power</span>
               <span className="text-white font-bold text-lg">150</span>
             </div>
          </div>
        </motion.div>

        {/* Right: Menu System */}
        <div className="flex-1 w-full max-w-lg h-[500px] relative">
          <AnimatePresence mode="wait">
            
            {/* MAIN MENU */}
            {activeView === 'menu' && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 gap-4 h-full"
              >
                {/* Single Player (Big) */}
                <button
                  onClick={startBattle}
                  disabled={loading}
                  className="col-span-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform shadow-lg shadow-orange-900/40"
                >
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  <div className="z-10 text-left">
                    <h3 className="text-3xl font-black italic tracking-tighter">BATTLE START</h3>
                    <p className="text-white/80 text-sm font-medium">Single Player Arcade Mode</p>
                  </div>
                  <div className="self-end bg-white/20 p-3 rounded-full backdrop-blur-md">
                    <Swords size={32} />
                  </div>
                </button>

                {/* Multiplayer */}
                <button 
                  className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:bg-slate-700 transition-colors group relative overflow-hidden"
                  onClick={() => alert("Multiplayer coming soon!")}
                >
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors">Multiplayer</h3>
                    <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-400 mt-1 inline-block">COMING SOON</span>
                  </div>
                  <Users className="self-end text-slate-600 group-hover:text-blue-400 transition-colors" size={24} />
                </button>

                {/* Stage Select */}
                <button 
                  onClick={() => setActiveView('stages')}
                  className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:bg-slate-700 transition-colors group"
                >
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors">Stages</h3>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">{STAGES.find(s => s.id === selectedStage)?.name}</p>
                  </div>
                  <Map className="self-end text-slate-600 group-hover:text-green-400 transition-colors" size={24} />
                </button>

                {/* Digidex */}
                <button 
                  onClick={() => setActiveView('digidex')}
                  className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:bg-slate-700 transition-colors group"
                >
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors">Digidex</h3>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">Database</p>
                  </div>
                  <ImageIcon className="self-end text-slate-600 group-hover:text-purple-400 transition-colors" size={24} />
                </button>

                {/* Gallery */}
                <button 
                  onClick={() => setActiveView('gallery')}
                  className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:bg-slate-700 transition-colors group"
                >
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors">Gallery</h3>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">Art Collection</p>
                  </div>
                  <Trophy className="self-end text-slate-600 group-hover:text-yellow-400 transition-colors" size={24} />
                </button>

                {/* Settings / Misc */}
                <button className="col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="text-sm font-medium">Daily Rewards Available!</span>
                  <Trophy size={16} className="text-yellow-600" />
                </button>
              </motion.div>
            )}

            {/* STAGE SELECT */}
            {activeView === 'stages' && (
              <motion.div 
                key="stages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Select Stage</h3>
                  <button onClick={() => setActiveView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>
                
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                  {STAGES.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStage(stage.id)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                        selectedStage === stage.id 
                        ? 'bg-white/10 border-orange-500 shadow-lg shadow-orange-900/20' 
                        : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className={`font-bold ${selectedStage === stage.id ? 'text-white' : 'text-slate-300'}`}>{stage.name}</span>
                        <span className="text-xs text-slate-500">{stage.desc}</span>
                      </div>
                      {selectedStage === stage.id && <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_orange]"></div>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* DIGIDEX */}
            {activeView === 'digidex' && (
              <motion.div 
                key="digidex"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Digidex</h3>
                    <p className="text-xs text-slate-400">Seen: <span className="text-orange-400">{encounteredDigimon.length}</span> / {galleryDigimon.length || '?'}</p>
                  </div>
                  <button onClick={() => setActiveView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-3 gap-3">
                  {galleryDigimon.map((d, i) => {
                    const isUnlocked = encounteredDigimon.includes(d.name);
                    return (
                      <button 
                        key={i} 
                        onClick={() => isUnlocked && setViewingDigimon(d)}
                        className={`p-2 rounded-xl border flex flex-col items-center relative overflow-hidden transition-all text-left ${
                        isUnlocked 
                        ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 cursor-pointer' 
                        : 'bg-slate-900/50 border-slate-800 cursor-not-allowed'
                      }`}>
                        {isUnlocked ? (
                          <>
                            <img src={d.img} alt={d.name} className="w-16 h-16 object-contain mb-2" />
                            <span className="text-[10px] text-center font-bold text-slate-300">{d.name}</span>
                            <span className="text-[8px] text-slate-500 uppercase">{d.level}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 mb-2 flex items-center justify-center opacity-20">
                               <ImageIcon size={32} />
                            </div>
                            <span className="text-[10px] text-center font-bold text-slate-600">???</span>
                            <span className="text-[8px] text-slate-700 uppercase">UNKNOWN</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                  {galleryDigimon.length === 0 && <div className="col-span-3 text-center text-slate-500">Loading Digimon Data...</div>}
                </div>
              </motion.div>
            )}

            {/* GALLERY */}
            {activeView === 'gallery' && (
              <motion.div 
                key="gallery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Art Gallery</h3>
                    <p className="text-xs text-slate-400">Unlocked: <span className="text-yellow-400">{unlockedGalleryArts.length}</span></p>
                  </div>
                  <button onClick={() => setActiveView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-4">
                  {galleryDigimon.map((d, i) => {
                    const isUnlocked = unlockedGalleryArts.includes(d.name);
                    return (
                      <div 
                        key={i} 
                        onClick={() => isUnlocked && setViewingGalleryItem(d)}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center relative overflow-hidden transition-all group ${
                        isUnlocked 
                        ? 'bg-slate-900 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] cursor-pointer hover:shadow-[0_0_25px_rgba(234,179,8,0.3)] hover:border-yellow-400' 
                        : 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
                      }`}>
                        {isUnlocked ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 to-transparent"></div>
                            <div className="w-full aspect-square relative mb-2 flex items-center justify-center">
                              <img src={d.img} alt={d.name} className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="flex flex-col items-center relative z-10">
                              <span className="text-sm font-black italic text-yellow-500">{d.name}</span>
                              <span className="text-[10px] text-yellow-700 font-bold uppercase tracking-widest">MASTERED</span>
                            </div>
                            <div className="absolute top-2 right-2 text-yellow-500">
                              <Trophy size={12} />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                             <Lock size={24} className="text-slate-700" />
                             <span className="text-xs text-slate-700 font-bold text-center">Win with {d.name} to unlock</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {galleryDigimon.length === 0 && <div className="col-span-2 text-center text-slate-500">Loading Art Data...</div>}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Digimon Detail Modal */}
      <AnimatePresence>
        {viewingDigimon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingDigimon(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative shadow-2xl"
            >
              <button 
                onClick={() => setViewingDigimon(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>

              <div className="flex flex-col items-center">
                <div className="w-48 h-48 relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-full blur-xl"></div>
                  <img src={viewingDigimon.img} alt={viewingDigimon.name} className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
                </div>

                <h2 className="text-3xl font-black italic tracking-tighter mb-2">{viewingDigimon.name}</h2>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-700 mb-6">
                  {viewingDigimon.level}
                </span>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Estimated HP</span>
                    <span className="text-xl font-bold text-green-400">
                      {viewingDigimon.level === 'Rookie' ? '800-1200' : 
                       viewingDigimon.level === 'Champion' ? '1500-2000' : 
                       viewingDigimon.level === 'Ultimate' ? '3000-4500' : '5000+'}
                    </span>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Power Level</span>
                    <span className="text-xl font-bold text-orange-400">
                      {viewingDigimon.level === 'Rookie' ? '100-300' : 
                       viewingDigimon.level === 'Champion' ? '400-800' : 
                       viewingDigimon.level === 'Ultimate' ? '1000-2500' : '5000+'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 w-full">
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    A {viewingDigimon.level} level Digimon found in the digital world. 
                    {viewingDigimon.level === 'Rookie' && " Has potential for great evolution."}
                    {viewingDigimon.level === 'Champion' && " A powerful combatant with developed skills."}
                    {viewingDigimon.level === 'Ultimate' && " An elite warrior with immense power."}
                    {viewingDigimon.level === 'Mega' && " A legendary being of absolute strength."}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Card View (Holographic) */}
      <AnimatePresence>
        {viewingGalleryItem && (
          <GalleryCardView 
            digimon={viewingGalleryItem} 
            onClose={() => setViewingGalleryItem(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
