import { useGameStore, BattleStage } from '../store/useGameStore';
import { fetchDigimonByLevel } from '../api/digimon';
import { Digimon } from '../types';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Swords, Users, Image as ImageIcon, Map, Trophy, Lock, Download, X, Loader2, Info, Search } from 'lucide-react';
import { createCheckoutSession } from '../api/stripe';
import { MatchmakingService } from '../services/matchmaking';

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
  const { playerDigimon, setPlayerDigimon, setEnemyDigimon, setGameState, selectedStage, setSelectedStage, encounteredDigimon, unlockDigimon, unlockedGalleryArts, resetBattle, entitlement, setEntitlement, playerId, setMultiplayerState } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [galleryDigimon, setGalleryDigimon] = useState<Digimon[]>([]);
  const [activeView, setActiveView] = useState<'menu' | 'stages' | 'gallery' | 'digidex' | 'multiplayer'>('menu');
  const [viewingDigimon, setViewingDigimon] = useState<Digimon | null>(null);
  const [viewingGalleryItem, setViewingGalleryItem] = useState<Digimon | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Multiplayer State
  const [mpMode, setMpMode] = useState<'menu' | 'host' | 'join'>('menu');
  const [roomPin, setRoomPin] = useState<string | null>(null);
  const [joinPin, setJoinPin] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const currentRoomIdRef = useRef<string | null>(null);

  const handleCreateRoom = async () => {
    setIsSearching(true);
    setSearchStatus('Creating room...');
    try {
      const room = await MatchmakingService.createHostRoom(playerId);
      currentRoomIdRef.current = room.id;
      setRoomPin(room.pin);
      setMpMode('host');
      setSearchStatus('Waiting for opponent...');
      
      const subscription = MatchmakingService.subscribeToRoom(room.id, (updatedRoom) => {
         if (updatedRoom.status === 'active' && updatedRoom.player2_id) {
           // Match found!
           subscription.unsubscribe();
           setMultiplayerState({
             isMultiplayer: true,
             roomId: updatedRoom.id,
             opponentId: updatedRoom.player2_id
           });
           setGameState('battle');
         }
      });
    } catch (e) {
      console.error(e);
      setSearchStatus('Error creating room.');
      setIsSearching(false);
    }
  };

  const handleJoinRoom = async () => {
    if (joinPin.length !== 6) return;
    setIsSearching(true);
    setSearchStatus('Joining room...');
    try {
      const room = await MatchmakingService.joinRoom(playerId, joinPin);
      
      setSearchStatus('Connected! Starting...');
      setMultiplayerState({
        isMultiplayer: true,
        roomId: room.id,
        opponentId: room.player1_id
      });
      setTimeout(() => setGameState('battle'), 1000);
    } catch (e) {
      console.error(e);
      setSearchStatus('Room not found or full.');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
     if (currentRoomIdRef.current && mpMode === 'host') {
       await MatchmakingService.cancelMatchSearch(currentRoomIdRef.current);
     }
     currentRoomIdRef.current = null;
     setRoomPin(null);
     setMpMode('menu');
     setIsSearching(false);
     setSearchStatus('');
     setJoinPin('');
  };

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
    if (query.get('success')) {
      alert('Thank you for your support! ☕');
      setEntitlement({
        user_id: 'local-user',
        product_id: 'full_app', // Using same ID for "supporter" status
        active: true,
        updated_at: new Date().toISOString()
      });
    }
    if (query.get('canceled')) alert('Donation canceled.');
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

  const handleSupportClick = () => {
    setShowSupportModal(true);
  };

  const processDonation = () => {
     // Check if env var is set, otherwise mock
     const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK; 
     if (PAYMENT_LINK) {
        createCheckoutSession(PAYMENT_LINK);
     } else {
        // Simulation for Development
        const confirm = window.confirm("No Stripe Link configured. Simulate successful donation?");
        if (confirm) {
            setEntitlement({
                user_id: 'local-user',
                product_id: 'full_app',
                active: true,
                updated_at: new Date().toISOString()
            });
            setShowSupportModal(false);
            alert("Thanks for the coffee! ☕ (Dev Mode)");
        }
     }
  };

  if (!playerDigimon) {
    setGameState('selection');
    return null;
  }
  
  const isSupporter = entitlement?.product_id === 'full_app' && entitlement?.active;

  return (
    <div className={`flex flex-col items-center min-h-screen text-white p-4 relative overflow-hidden transition-all duration-700 bg-gradient-to-br ${STAGES.find(s => s.id === selectedStage)?.color || 'from-slate-900 to-black'}`}>
      
      {/* Background Particles/Grid Effect */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSupportModal(false)}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-slate-900 border border-yellow-500 rounded-3xl p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(234,179,8,0.2)]"
                >
                    <button onClick={() => setShowSupportModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
                    
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg mb-2">
                            <Sparkles className="text-white" size={32} />
                        </div>
                        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500">SUPPORT DEV</h2>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium">
                            Enjoying this gesture recognition demo?
                        </p>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            ☕ Support future development<br/>
                            (All features free - donations appreciated but not required)
                        </p>
                        
                        <button 
                            onClick={processDonation}
                            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            <Sparkles size={20} />
                            DONATE COFFEE
                        </button>
                        <p className="text-[10px] text-slate-600">Secure payment via Stripe.</p>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Credits Modal */}
      <AnimatePresence>
        {showCreditsModal && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreditsModal(false)}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(100,116,139,0.2)]"
                >
                    <button onClick={() => setShowCreditsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
                    
                    <div className="flex flex-col items-center text-center gap-6">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center shadow-lg mb-2 border border-slate-700">
                            <Info className="text-slate-300" size={32} />
                        </div>
                        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400">CREDITS</h2>
                        
                        <div className="w-full space-y-4">
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Contributors</h3>
                                <p className="text-white font-medium">Lead Developer: lululuqman</p>
                                <p className="text-slate-500 text-xs">AI Pair Programmer: Trae (Gemini)</p>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Tech Stack</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'Supabase', 'Stripe', 'MediaPipe', 'Gemini API'].map((tech) => (
                                        <span key={tech} className="px-2 py-1 bg-slate-700 rounded-md text-[10px] text-slate-300 font-mono border border-slate-600">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="w-full max-w-6xl flex justify-between items-center z-10 mb-8">
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-black italic text-xl shadow-lg">D</div>
           <span className="font-bold text-xl tracking-tighter italic opacity-80">DIGI-BATTLE</span>
        </div>
        {!isSupporter && (
          <button 
            onClick={handleSupportClick}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/50 rounded-full text-yellow-500 text-xs font-bold hover:bg-yellow-500/20 transition-colors backdrop-blur-sm"
          >
            <Sparkles size={14} />
            SUPPORT DEV
          </button>
        )}
        {isSupporter && (
           <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-bold backdrop-blur-sm">
             <Trophy size={14} />
             SUPPORTER
           </div>
        )}
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
                  className="backdrop-blur-md border rounded-3xl p-6 flex flex-col justify-between transition-colors group relative overflow-hidden bg-blue-900/50 border-blue-500/50 hover:bg-blue-900/80 cursor-pointer"
                  onClick={() => {
                    setMpMode('menu');
                    setJoinPin('');
                    setRoomPin(null);
                    setIsSearching(false);
                    setActiveView('multiplayer');
                  }}
                >
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-bold transition-colors text-blue-300 group-hover:text-white">Multiplayer</h3>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded mt-1 inline-block border border-blue-500/30">ONLINE</span>
                  </div>
                  <Users className="self-end transition-colors text-blue-400 group-hover:text-white" size={24} />
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

                {/* Credits / Misc */}
                <button 
                  onClick={() => setShowCreditsModal(true)}
                  className="col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-slate-500 hover:text-slate-300 transition-colors hover:bg-slate-900/80 cursor-pointer"
                >
                  <span className="text-sm font-medium">Credits</span>
                  <Info size={16} className="text-slate-600" />
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

            {/* MULTIPLAYER LOBBY */}
            {activeView === 'multiplayer' && (
              <motion.div 
                key="multiplayer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden"
              >
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(59,130,246,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.2)_1px,transparent_1px)] bg-[length:20px_20px]"></div>

                <div className="flex items-center justify-between mb-6 z-10">
                  <div className="flex items-center gap-2">
                    <Users className="text-blue-400" />
                    <div>
                      <h3 className="text-2xl font-bold text-blue-100">Online Battle</h3>
                      <p className="text-xs text-blue-400">Find opponents worldwide</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveView('menu')} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6">
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center relative animate-pulse">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                        <Swords size={48} className="text-blue-400" />
                    </div>
                    
                    <div className="text-center">
                        <h4 className="text-xl font-bold text-white mb-2">Ready to Duel?</h4>
                        <p className="text-sm text-slate-400 max-w-xs">
                            Matchmaking will search for other players with similar skill levels.
                        </p>
                    </div>

                    <div className="w-full flex flex-col items-center">
                        {mpMode === 'menu' && (
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={handleCreateRoom}
                                    className="flex-1 px-4 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/50 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2"
                                >
                                    <Swords size={32} />
                                    <span className="text-sm tracking-wider">CREATE ROOM</span>
                                </button>
                                <button 
                                    onClick={() => setMpMode('join')}
                                    className="flex-1 px-4 py-6 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/50 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2 border border-slate-600"
                                >
                                    <Users size={32} />
                                    <span className="text-sm tracking-wider">JOIN ROOM</span>
                                </button>
                            </div>
                        )}

                        {mpMode === 'host' && (
                            <div className="flex flex-col items-center gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Game PIN</span>
                                    <div className="text-6xl font-black tracking-[0.2em] text-white bg-white/10 px-8 py-4 rounded-2xl border border-white/20 select-all shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                        {roomPin}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 text-blue-300 animate-pulse bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                                    <Loader2 className="animate-spin" size={16} />
                                    <span className="text-sm font-bold tracking-wide">Waiting for players...</span>
                                </div>

                                <button 
                                    onClick={handleCancelSearch}
                                    className="text-slate-500 hover:text-white text-sm font-bold transition-colors"
                                >
                                    CANCEL
                                </button>
                            </div>
                        )}

                        {mpMode === 'join' && (
                            <div className="flex flex-col items-center gap-4 w-full max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="w-full">
                                    <label className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2 block text-center">Enter Game PIN</label>
                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        value={joinPin}
                                        onChange={(e) => setJoinPin(e.target.value.replace(/\D/g,''))}
                                        placeholder="000000"
                                        className="w-full bg-black/40 border border-slate-600 rounded-xl px-4 py-4 text-center text-4xl font-black tracking-[0.2em] text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-800"
                                    />
                                </div>

                                {isSearching ? (
                                    <div className="flex items-center gap-2 text-blue-300 animate-pulse my-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="font-bold tracking-wider">{searchStatus}</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleJoinRoom}
                                        disabled={joinPin.length !== 6}
                                        className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        ENTER
                                    </button>
                                )}
                                
                                {!isSearching && (
                                    <button 
                                        onClick={() => { setMpMode('menu'); setJoinPin(''); }}
                                        className="text-slate-500 hover:text-white text-sm font-bold transition-colors mt-2"
                                    >
                                        BACK
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 z-10">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Online Players: <b className="text-green-400">1,240</b></span>
                        <span>Server: <b className="text-slate-300">US-East</b></span>
                    </div>
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">Art Gallery</h3>
                    <p className="text-xs text-slate-400">Unlocked: <span className="text-yellow-400">ALL</span></p>
                  </div>
                  <button onClick={() => { setActiveView('menu'); setSearchTerm(''); }} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Digimon..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                  {galleryDigimon.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((d, i) => {
                    const isUnlocked = true; // unlockedGalleryArts.includes(d.name);
                    return (
                      <div 
                        key={i} 
                        onClick={() => isUnlocked && setViewingGalleryItem(d)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all group ${
                        isUnlocked 
                        ? 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 hover:border-yellow-500/50 cursor-pointer' 
                        : 'bg-slate-950/30 border-slate-800 opacity-50 cursor-not-allowed'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center p-1 ${isUnlocked ? 'bg-slate-800' : 'bg-slate-900'}`}>
                            {isUnlocked ? (
                               <img src={d.img} alt={d.name} className="w-full h-full object-contain" />
                            ) : (
                               <Lock size={16} className="text-slate-700" />
                            )}
                          </div>
                          
                          <div className="flex flex-col">
                            <span className={`text-lg font-bold ${isUnlocked ? 'text-white group-hover:text-yellow-400' : 'text-slate-600'}`}>
                                {d.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                                {isUnlocked ? 'Mastered Art' : 'Locked'}
                            </span>
                          </div>
                        </div>

                        {isUnlocked && (
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                                <Trophy size={18} />
                            </div>
                        )}
                      </div>
                    );
                  })}
                  {galleryDigimon.length === 0 && <div className="text-center text-slate-500 py-8">Loading Art Data...</div>}
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
