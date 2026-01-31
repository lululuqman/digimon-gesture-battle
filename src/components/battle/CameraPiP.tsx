import { useEffect } from 'react';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useGameStore } from '../../store/useGameStore';

export const CameraPiP = () => {
  const { videoRef, gesture, processVideo, isLoading } = useMediaPipe();
  const setGestures = useGameStore((s) => s.setGestures);
  const playerGesture = useGameStore((s) => s.playerGesture);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (videoRef.current) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
          });
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            processVideo();
          };
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

  return (
    <div className="fixed bottom-4 right-4 w-32 h-44 bg-slate-800 rounded-2xl border-2 border-orange-500 overflow-hidden shadow-2xl z-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover mirror"
        style={{ transform: 'scaleX(-1)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-orange-600 text-white text-[10px] font-black py-1 text-center uppercase tracking-widest">
        {gesture === 'none' ? 'READY' : gesture}
      </div>
    </div>
  );
};
