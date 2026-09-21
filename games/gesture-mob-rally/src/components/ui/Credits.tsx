import HoverButton from '../common/HoverButton';

export default function Credits({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#12101a] text-white flex flex-col items-center justify-center px-8 text-center">
      <h1 className="text-2xl font-extrabold mb-4">Mob Rally</h1>
      <p className="text-white/60 max-w-md mb-2">
        An original gesture-controlled crowd runner built for KinetoFun. Every asset, mechanic, level,
        and sound is original — designed from the ground up for hand-tracking gameplay.
      </p>
      <p className="text-white/40 text-sm max-w-md mb-8">
        Built with React, Canvas 2D, and MediaPipe Hands. All music and sound effects are synthesized
        in-browser with the Web Audio API — no external asset files.
      </p>
      <HoverButton onSelect={onBack} className="rounded-full overflow-hidden">
        <div className="px-6 py-2.5 bg-white/10 font-bold">Back</div>
      </HoverButton>
    </div>
  );
}
