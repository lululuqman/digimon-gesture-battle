import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Gesture } from '../types';

export interface HandData {
  landmarks: any[];
  gesture: Gesture;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  label: string;
}

export const useMediaPipe = () => {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [gesture, setGesture] = useState<Gesture>('none');
  const [hands, setHands] = useState<HandData[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVideoTimeRef = useRef(-1);
  // Rolling buffer for smoothing gestures
  const gestureHistoryRef = useRef<Gesture[]>([]);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let isMounted = true;

    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
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

  useEffect(() => {
    let animationFrameId: number;

    const processVideo = () => {
      if (
        videoRef.current && 
        handLandmarker && 
        videoRef.current.readyState >= 2 && // HAVE_CURRENT_DATA
        videoRef.current.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        try {
          const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
          
          if (results.landmarks && results.landmarks.length > 0) {
            const detectedHands: HandData[] = results.landmarks.map((handLandmarks, index) => {
              const rawGesture = detectGesture(handLandmarks);
              
              // Smoothing logic: update history
              const history = gestureHistoryRef.current;
              history.push(rawGesture);
              if (history.length > 5) history.shift();
              
              // Find most frequent gesture
              const counts: Record<string, number> = {};
              let maxCount = 0;
              let smoothedGesture: Gesture = rawGesture;
              
              for (const g of history) {
                counts[g] = (counts[g] || 0) + 1;
                if (counts[g] > maxCount) {
                  maxCount = counts[g];
                  smoothedGesture = g as Gesture;
                }
              }

              // Only switch if confidence is high (>3/5 frames)
              const finalGesture = maxCount >= 3 ? smoothedGesture : gesture;

              // Calculate bounding box
              const xs = handLandmarks.map(p => p.x);
              const ys = handLandmarks.map(p => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              
              const handedness = results.handedness?.[index]?.[0];
              const label = `${handedness?.displayName || 'Hand'}: ${finalGesture === 'none' ? '...' : finalGesture}`;

              return {
                landmarks: handLandmarks,
                gesture: finalGesture,
                boundingBox: {
                  x: minX - 0.05,
                  y: minY - 0.05,
                  width: (maxX - minX) + 0.1,
                  height: (maxY - minY) + 0.1
                },
                label
              };
            });

            setGesture(detectedHands[0].gesture);
            setHands(detectedHands);
          } else {
            gestureHistoryRef.current = []; // Reset history on no hands
            setGesture('none');
            setHands([]);
          }
        } catch (error) {
          console.error("Detection error:", error);
        }
      }
      animationFrameId = requestAnimationFrame(processVideo);
    };

    if (handLandmarker) {
      animationFrameId = requestAnimationFrame(processVideo);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [handLandmarker]);

  const detectGesture = (points: any[]): Gesture => {
    // Advanced gesture detection logic
    // points is an array of 21 points
    
    // Finger tips: 8 (index), 12 (middle), 16 (ring), 20 (pinky)
    // Finger bases (MCP): 5 (index), 9 (middle), 13 (ring), 17 (pinky)
    // Finger PIP (second joint from tip): 6, 10, 14, 18
    // Wrist: 0
    
    // Helper to check if a finger is extended (Tip higher than PIP for upright hand)
    // Using Y-coordinate (smaller Y is higher in screen coordinates)
    // But better: Distance check. Tip should be further from wrist than PIP is.
    
    const dist = (p1: number, p2: number) => {
      return Math.sqrt(
        Math.pow(points[p1].x - points[p2].x, 2) + 
        Math.pow(points[p1].y - points[p2].y, 2)
      );
    };

    const isFingerExtended = (tip: number, pip: number) => {
      // Check 1: Simple Y-axis check (works for upright hand)
      // points[tip].y < points[pip].y
      
      // Check 2: Distance from wrist (works for any orientation)
      return dist(tip, 0) > dist(pip, 0);
    };
    
    const indexExtended = isFingerExtended(8, 6);
    const middleExtended = isFingerExtended(12, 10);
    const ringExtended = isFingerExtended(16, 14);
    const pinkyExtended = isFingerExtended(20, 18);

    // Thumb is tricky. Let's check if tip is far from pinky base (MCP 17)
    // or just check if it's extended away from palm.
    // Simple check: Thumb tip distance to Index MCP (5) vs Thumb IP (3) distance to Index MCP (5)
    // If Tip is further, it's extended.
    // const thumbExtended = dist(4, 5) > dist(3, 5);

    // Debug log (throttled in real app, but useful here)
    // console.log({ indexExtended, middleExtended, ringExtended, pinkyExtended, thumbExtended });

    // Rock (Fist): All 4 fingers curled. Thumb can be anywhere (usually tucked or side)
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'fist';
    
    // Paper (Open Palm): All 5 fingers extended (or at least 4 main ones)
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) return 'open_palm';
    
    // Scissors (Peace): Index + Middle extended. Ring + Pinky curled.
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return 'peace';
    
    // Swipe: Index extended only (simplified for swipe)
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'swipe';

    return 'none';
  };

  return {
    videoRef,
    gesture,
    hands,
    isLoading: !handLandmarker
  };
};
