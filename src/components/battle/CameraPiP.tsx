import { useEffect, useState, useRef } from 'react';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useGameStore } from '../../store/useGameStore';
import { Video, VideoOff } from 'lucide-react';

export const CameraPiP = () => {
  const { videoRef, gesture, hands, isLoading } = useMediaPipe();
  const setGestures = useGameStore((s) => s.setGestures);
  const playerGesture = useGameStore((s) => s.playerGesture);
  const [isVisible, setIsVisible] = useState(true);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (videoRef.current) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
          });
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Update store with detected gesture
    if (gesture !== playerGesture) {
      setGestures(gesture, 'none'); // enemy gesture handled elsewhere
    }
  }, [gesture, playerGesture, setGestures]);

  // Helper to map gesture to display text and color
  const getGestureDisplay = (g: string) => {
    switch (g) {
      case 'fist': return { text: 'ROCK', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500' };
      case 'open_palm': return { text: 'PAPER', color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500' };
      case 'peace': return { text: 'SCISSORS', color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500' };
      case 'swipe': return { text: 'SWIPE', color: 'text-purple-500', bg: 'bg-purple-500/20', border: 'border-purple-500' };
      default: return { text: 'DETECTING...', color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-600' };
    }
  };

  // Calculate SVG viewBox to match video object-cover cropping
  const getViewBox = () => {
    if (!videoSize || !containerRef.current) return "0 0 1 1";
    
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const videoW = videoSize.width;
    const videoH = videoSize.height;

    const containerRatio = containerW / containerH;
    const videoRatio = videoW / videoH;

    let viewBox = "0 0 1 1";

    if (videoRatio > containerRatio) {
      // Video is wider than container (e.g. 16:9 video in 4:3 container)
      // Cropped horizontally. Height matches.
      // We see (containerRatio / videoRatio) of the width.
      const visibleWidth = containerRatio / videoRatio;
      const xOffset = (1 - visibleWidth) / 2;
      viewBox = `${xOffset} 0 ${visibleWidth} 1`;
    } else {
      // Video is taller than container (unlikely for webcam, but possible)
      // Cropped vertically. Width matches.
      const visibleHeight = videoRatio / containerRatio;
      const yOffset = (1 - visibleHeight) / 2;
      viewBox = `${0} ${yOffset} 1 ${visibleHeight}`;
    }
    
    return viewBox;
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-slate-800 text-white p-3 rounded-full shadow-lg border-2 border-slate-600 hover:bg-slate-700 transition-colors z-50"
        title="Show Camera"
      >
        <VideoOff size={24} />
      </button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-4 right-4 w-64 h-48 bg-slate-900 rounded-2xl border-2 border-slate-600 overflow-hidden shadow-2xl z-50 group"
    >
      {/* Toggle Button (visible on hover) */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors z-[60] opacity-0 group-hover:opacity-100"
        title="Hide Camera"
      >
        <Video size={16} />
      </button>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-40">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Webcam Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          setVideoSize({
            width: e.currentTarget.videoWidth,
            height: e.currentTarget.videoHeight
          });
        }}
        className="w-full h-full object-cover mirror"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Hand Gesture Overlay */}
      {hands.length > 0 && (
        <>
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-30" 
            viewBox={getViewBox()}
            preserveAspectRatio="none"
            style={{ transform: 'scaleX(-1)' }}
          >
            {hands.map((hand, handIdx) => {
               // const style = getGestureDisplay(hand.gesture); // Unused here
               return (
                <g key={handIdx}>
                  {/* Filter Skeleton - Neon Glow Style */}
                  {[
                    [0, 1, 2, 3, 4], // Thumb
                    [0, 5, 6, 7, 8], // Index
                    [0, 9, 10, 11, 12], // Middle
                    [0, 13, 14, 15, 16], // Ring
                    [0, 17, 18, 19, 20], // Pinky
                    [5, 9, 13, 17], // Palm
                  ].map((path, pathIdx) => (
                    <polyline
                      key={pathIdx}
                      points={path.map(idx => `${hand.landmarks[idx].x},${hand.landmarks[idx].y}`).join(' ')}
                      fill="none"
                      stroke={handIdx === 0 ? "#f97316" : "#3b82f6"}
                      strokeWidth="0.015"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]"
                    />
                  ))}
                  
                  {/* Joints - Glowing Points */}
                  {hand.landmarks.map((pt, i) => (
                    <circle 
                      key={i} 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="0.008" 
                      fill="white" 
                      className="drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
          
          {/* HTML Overlay for Gesture Name */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1 items-center z-40 bg-gradient-to-t from-black/90 to-transparent">
            {hands.map((hand, idx) => {
               const style = getGestureDisplay(hand.gesture);
               return (
                <div key={idx} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${style.bg} ${style.border} backdrop-blur-md`}>
                   <span className={`text-xs font-black tracking-widest ${style.color}`}>
                     {style.text}
                   </span>
                </div>
               );
            })}
          </div>
        </>
      )}

      {hands.length === 0 && (
         <div className="absolute bottom-2 left-0 right-0 text-center z-40">
           <span className="text-[10px] text-slate-500 font-mono bg-black/50 px-2 py-1 rounded">NO HAND DETECTED</span>
         </div>
      )}
    </div>
  );
};
