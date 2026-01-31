import { useRef, useEffect, useState, useCallback } from 'react';

type SoundType = 'click' | 'hover' | 'countdown' | 'fight' | 'win' | 'loss' | 'damage' | 'victory';

export const useSound = () => {
  const audioContext = useRef<AudioContext | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize AudioContext on first user interaction or mount
    const initAudio = () => {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setIsReady(true);
      }
    };
    
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
    if (isMuted || !audioContext.current) return;

    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }, [isMuted]);

  const playSFX = useCallback((type: SoundType) => {
    if (isMuted || !audioContext.current) return;
    const ctx = audioContext.current;

    switch (type) {
      case 'click':
        playTone(800, 'sine', 0.1);
        break;
      case 'hover':
        playTone(400, 'sine', 0.05);
        break;
      case 'countdown':
        playTone(600, 'square', 0.1);
        break;
      case 'fight':
        playTone(400, 'sawtooth', 0.1);
        playTone(600, 'sawtooth', 0.2, 0.1);
        playTone(800, 'sawtooth', 0.4, 0.2);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C Major
          playTone(freq, 'triangle', 0.3, i * 0.1);
        });
        break;
      case 'loss':
        [392.00, 369.99, 349.23, 311.13].forEach((freq, i) => { // Descending chromatic
          playTone(freq, 'sawtooth', 0.4, i * 0.2);
        });
        break;
      case 'damage':
        // Layer 1: The "Crunch" (Noise)
        const noiseOsc = ctx.createOscillator();
        const noiseGain = ctx.createGain();
        noiseOsc.type = 'sawtooth'; // Rougher than sine
        // Modulate frequency randomly for noise texture
        noiseOsc.frequency.setValueAtTime(100, ctx.currentTime);
        noiseOsc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
        
        noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        noiseOsc.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseOsc.start(ctx.currentTime);
        noiseOsc.stop(ctx.currentTime + 0.15);

        // Layer 2: The "Thud" (Low Body Blow)
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'square';
        thudOsc.frequency.setValueAtTime(150, ctx.currentTime);
        thudOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
        
        thudGain.gain.setValueAtTime(0.8, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);
        thudOsc.start(ctx.currentTime);
        thudOsc.stop(ctx.currentTime + 0.2);
        break;
      case 'victory':
         // Fanfare
        [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
           playTone(freq, 'square', 0.2, i * 0.15);
        });
        break;
    }
  }, [isMuted, playTone]);

  const bgmOscillators = useRef<OscillatorNode[]>([]);
  const bgmGain = useRef<GainNode | null>(null);
  const bgmInterval = useRef<any>(null);
  const currentThemeRef = useRef<'battle' | 'lobby' | null>(null);

  const stopBGM = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current = null;
    }
    // Stop oscillators
    bgmOscillators.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    bgmOscillators.current = [];
    if (bgmGain.current) {
      bgmGain.current.disconnect();
      bgmGain.current = null;
    }
    if (bgmInterval.current) {
      clearInterval(bgmInterval.current);
      bgmInterval.current = null;
    }
    currentThemeRef.current = null;
  }, []);

  const playGenerativeTheme = useCallback((theme: 'battle' | 'lobby') => {
    if (isMuted || !audioContext.current) return;
    
    // Prevent restarting if same theme
    if (currentThemeRef.current === theme) return;

    // Stop existing BGM
    stopBGM();
    currentThemeRef.current = theme;

    const ctx = audioContext.current;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3; 
    masterGain.connect(ctx.destination);
    bgmGain.current = masterGain;

    let scheduler: () => void;
    let stepTime: number;

    if (theme === 'battle') {
        // --- BATTLE THEME (Techno/Synthwave) ---
        const bpm = 128;
        stepTime = 60 / bpm / 4; // 16th note duration
        let step = 0;

        // Bass Sequence (Dm: D - F - G - A)
        const bassSeq = [
          36.71, 36.71, 0, 36.71,  // D1
          43.65, 43.65, 0, 43.65,  // F1
          49.00, 49.00, 0, 49.00,  // G1
          55.00, 55.00, 0, 55.00   // A1
        ];

        // Arp Sequence (Dm7)
        const arpSeq = [
           293.66, 349.23, 440.00, 523.25, // D4, F4, A4, C5
           587.33, 523.25, 440.00, 349.23
        ];

        const playBattleStep = (t: number) => {
          // 1. KICK DRUM (Every quarter note: 0, 4, 8, 12)
          if (step % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.5);
          }

          // 2. HI-HAT (Every off-beat eighth note: 2, 6, 10, 14)
          if (step % 4 === 2) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(8000, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
          }
          
          // 3. SNARE (Every 4th quarter note: 4, 12)
          if (step % 8 === 4) {
             const osc = ctx.createOscillator();
             const gain = ctx.createGain();
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(200, t);
             osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
             gain.gain.setValueAtTime(0.4, t);
             gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
             osc.connect(gain);
             gain.connect(masterGain);
             osc.start(t);
             osc.stop(t + 0.2);
             
             const noiseOsc = ctx.createOscillator();
             const noiseGain = ctx.createGain();
             noiseOsc.type = 'sawtooth';
             noiseOsc.frequency.setValueAtTime(3000, t);
             noiseGain.gain.setValueAtTime(0.2, t);
             noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
             noiseOsc.connect(noiseGain);
             noiseGain.connect(masterGain);
             noiseOsc.start(t);
             noiseOsc.stop(t + 0.15);
          }

          // 4. BASSLINE
          const bassFreq = bassSeq[Math.floor(step / 2) % bassSeq.length];
          if (bassFreq > 0 && step % 2 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassFreq, t);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, t);
            filter.frequency.exponentialRampToValueAtTime(1000, t + 0.05);
            filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.3);
          }

          // 5. ARPEGGIO
          if (step % 2 === 0) { 
            const arpNote = arpSeq[step % arpSeq.length];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(arpNote, t);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
          }
          step++;
        };

        scheduler = () => {
             // Lookahead 0.1s
             while (nextNoteTime < ctx.currentTime + 0.1) {
                playBattleStep(nextNoteTime);
                nextNoteTime += stepTime;
             }
        }

    } else {
        // --- LOBBY THEME (Tech/Preparation - "System Ready") ---
        // Mid-tempo, Tension, Digital, E Minor
        const bpm = 110;
        stepTime = 60 / bpm / 4; // 16th notes
        let step = 0;

        // E Minor Pentatonic for that "Tech" feel (E, G, A, B, D)
        const techScale = [329.63, 392.00, 440.00, 493.88, 587.33, 659.25]; 
        
        const playLobbyStep = (t: number) => {
             // 1. DIGITAL KICK (Punchy) - Four on the floor-ish
             if (step % 4 === 0) {
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.frequency.setValueAtTime(100, t);
                 osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3);
                 
                 gain.gain.setValueAtTime(0.6, t); // Louder
                 gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                 
                 osc.connect(gain);
                 gain.connect(masterGain);
                 osc.start(t);
                 osc.stop(t + 0.3);
             }

             // 2. HI-TECH BASS (Rolling Sawtooth) - Every 8th note
             if (step % 2 === 0) {
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 const filter = ctx.createBiquadFilter();

                 osc.type = 'sawtooth';
                 // Toggle between E1 and E2 for movement
                 const freq = (step % 4 === 0) ? 41.20 : 82.41; 
                 osc.frequency.setValueAtTime(freq, t);

                 filter.type = 'lowpass';
                 filter.frequency.setValueAtTime(300, t);
                 filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

                 gain.gain.setValueAtTime(0.4, t);
                 gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

                 osc.connect(filter);
                 filter.connect(gain);
                 gain.connect(masterGain);
                 osc.start(t);
                 osc.stop(t + 0.2);
             }

             // 3. DATA STREAM ARPEGGIO (Random high pitch squares)
             // Fast 16th notes, 50% chance
             if (Math.random() > 0.4) {
                 const note = techScale[Math.floor(Math.random() * techScale.length)];
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 
                 osc.type = 'square';
                 osc.frequency.setValueAtTime(note * 2, t); // Octave up
                 
                 gain.gain.setValueAtTime(0.08, t); // Audible but background
                 gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1); // Short blip
                 
                 osc.connect(gain);
                 gain.connect(masterGain);
                 osc.start(t);
                 osc.stop(t + 0.1);
             }

             // 4. SNARE / CLAP (Digital Noise) - Beat 2 and 4 (Step 4 and 12)
             if (step % 8 === 4) {
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.type = 'triangle'; // Tonal layer
                 osc.frequency.setValueAtTime(150, t);
                 osc.frequency.linearRampToValueAtTime(100, t+0.1);
                 
                 gain.gain.setValueAtTime(0.3, t);
                 gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                 osc.connect(gain);
                 gain.connect(masterGain);
                 osc.start(t);
                 osc.stop(t + 0.15);

                 // Noise layer (simulated with high freq chaotic FM or just high saw)
                 const noiseOsc = ctx.createOscillator();
                 const noiseGain = ctx.createGain();
                 noiseOsc.type = 'sawtooth';
                 noiseOsc.frequency.setValueAtTime(800 + Math.random()*500, t);
                 
                 noiseGain.gain.setValueAtTime(0.2, t);
                 noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                 
                 noiseOsc.connect(noiseGain);
                 noiseGain.connect(masterGain);
                 noiseOsc.start(t);
                 noiseOsc.stop(t + 0.1);
             }

             step++;
        }

        scheduler = () => {
            while (nextNoteTime < ctx.currentTime + 0.1) {
               playLobbyStep(nextNoteTime);
               nextNoteTime += stepTime;
            }
       }
    }

    let nextNoteTime = ctx.currentTime;
    bgmInterval.current = setInterval(scheduler, 25);

  }, [isMuted, stopBGM]);

  const playBGM = useCallback((type: 'battle' | 'lobby') => {
    playGenerativeTheme(type);
  }, [playGenerativeTheme]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      if (bgmRef.current) {
        if (newState) bgmRef.current.pause();
        else bgmRef.current.play().catch(console.error);
      }
      return newState;
    });
  }, []);

  return { playSFX, playBGM, stopBGM, toggleMute, isMuted, isReady };
};
