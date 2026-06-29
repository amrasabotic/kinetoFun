import { useGesture } from '../systems/GestureManager';
import { Hand } from 'lucide-react';

export default function HandLostOverlay() {
  const { state } = useGesture();

  if (state.isHandDetected) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="text-center animate-pulse">
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <Hand className="w-24 h-24 text-white/40" strokeWidth={1} />
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
        </div>
        <h2 className="text-2xl font-semibold text-white/90 mb-2">
          Show your hand to continue
        </h2>
        <p className="text-sm text-white/50">
          Hold your hand in front of the camera
        </p>
      </div>
    </div>
  );
}
