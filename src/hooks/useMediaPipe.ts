import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Gesture } from '../types';

export const useMediaPipe = () => {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [gesture, setGesture] = useState<Gesture>('none');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let isMounted = true;

    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (isMounted) {
          setHandLandmarker(landmarker);
        }
      } catch (error) {
        console.error("Failed to initialize HandLandmarker:", error);
      }
    };
    initHandLandmarker();

    return () => {
      isMounted = false;
      if (landmarker) {
        landmarker.close();
      }
    };
  }, []);

  const detectGesture = (landmarks: any[]): Gesture => {
    // Basic gesture detection logic based on landmarks
    // landmarks[0] is an array of 21 points
    const points = landmarks[0];
    
    // Finger tips: 8 (index), 12 (middle), 16 (ring), 20 (pinky)
    // Finger bases: 5 (index), 9 (middle), 13 (ring), 17 (pinky)
    
    const isExtended = (tip: number, base: number) => points[tip].y < points[base].y;
    
    const indexExtended = isExtended(8, 5);
    const middleExtended = isExtended(12, 9);
    const ringExtended = isExtended(16, 13);
    const pinkyExtended = isExtended(20, 17);

    // Fist: all fingers curled
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'fist';
    
    // Open Palm: all fingers extended
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) return 'open_palm';
    
    // Peace: index and middle extended
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return 'peace';
    
    // Swipe: index extended only (simplified for swipe)
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'swipe';

    return 'none';
  };

  const processVideo = () => {
    if (videoRef.current && handLandmarker && videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        const detected = detectGesture(results.landmarks);
        setGesture(detected);
      } else {
        setGesture('none');
      }
    }
    requestAnimationFrame(processVideo);
  };

  return {
    videoRef,
    gesture,
    processVideo,
    isLoading: !handLandmarker
  };
};
