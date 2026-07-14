interface Props {
  basketRef: (el: HTMLDivElement | null) => void;
  isHeld: boolean;
}

export default function Basket({ basketRef, isHeld }: Props) {
  return (
    <div
      ref={basketRef}
      className={`flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl border-2 transition-colors ${
        isHeld ? 'bg-yellow-400/25 border-yellow-300' : 'bg-black/20 border-white/15'
      }`}
    >
      <span className="text-4xl">🧺</span>
      <span className="text-[10px] font-bold text-white/70">Basket</span>
    </div>
  );
}
