import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { PizzaOrder, HandState } from './types';
import { INGREDIENT_LABELS, INGREDIENT_COLORS } from './types';
import { useHandTracking } from './useHandTracking';
import WebcamPreview from './WebcamPreview';
import { CheckCircle } from 'lucide-react';

interface OrderScreenProps {
  order: PizzaOrder;
  onAccept: () => void;
  showPizzaBox?: boolean;
  finalScore?: number;
  onGivePizza?: () => void;
}

export default function OrderScreen({
  order,
  onAccept,
  showPizzaBox = false,
  finalScore,
  onGivePizza,
}: OrderScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handState, setHandState] = useState<HandState>({
    cursorX: -1, cursorY: -1, isPinching: false, isTracking: false,
  });
  const [acceptHovered, setAcceptHovered] = useState(false);
  const [giveHovered, setGiveHovered] = useState(false);
  const prevPinchRef = useRef(false);

  const handleHandUpdate = useCallback((state: HandState) => setHandState(state), []);
  useHandTracking(videoRef as React.RefObject<HTMLVideoElement | null>, handleHandUpdate, true);

  const cursorScreenX = handState.cursorX >= 0 ? handState.cursorX * window.innerWidth : -999;
  const cursorScreenY = handState.cursorY >= 0 ? handState.cursorY * window.innerHeight : -999;

  useEffect(() => {
    const acceptBtn = document.getElementById('order-accept-btn');
    const giveBtn = document.getElementById('give-pizza-btn');

    function isOver(el: HTMLElement | null) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return cursorScreenX >= r.left && cursorScreenX <= r.right &&
        cursorScreenY >= r.top && cursorScreenY <= r.bottom;
    }

    const overAccept = isOver(acceptBtn);
    const overGive = isOver(giveBtn);
    setAcceptHovered(overAccept);
    setGiveHovered(overGive);

    // Fire only on pinch-start to avoid repeat triggers
    if (handState.isPinching && !prevPinchRef.current) {
      if (overAccept) onAccept();
      if (overGive && onGivePizza) onGivePizza();
    }
    prevPinchRef.current = handState.isPinching;
  }, [handState, cursorScreenX, cursorScreenY, onAccept, onGivePizza]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* ── Layer 1: Restaurant background wall ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1c0e04 0%, #2e1608 25%, #3d2010 50%, #2e1608 65%, #1c0e04 100%)'
      }} />

      {/* Warm ambient glow from ceiling lights */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 50% at 50% 10%, rgba(255,180,60,0.22) 0%, transparent 70%)'
      }} />

      {/* Brick wall */}
      <div className="absolute inset-0 pointer-events-none" style={{ bottom: '28%' }}>
        <BrickWall />
      </div>

      {/* Back shelves with bottles */}
      <div className="absolute pointer-events-none" style={{ top: '14%', left: 0, right: 0 }}>
        <BackShelf />
      </div>

      {/* Pendant lamps */}
      <div className="absolute inset-0 pointer-events-none">
        <PendantLamps />
      </div>

      {/* Menu board */}
      <div className="absolute pointer-events-none z-10" style={{ top: '5%', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="bg-amber-950 border-2 border-amber-700 rounded-lg px-8 py-3 shadow-2xl whitespace-nowrap">
          <div className="text-yellow-300 font-black text-lg tracking-widest text-center mb-1">★ PIZZA MAKER ★</div>
          <div className="flex gap-5 justify-center">
            {['Margherita $12', 'Pepperoni $14', 'Garden $13', 'The Works $16'].map((item) => (
              <span key={item} className="text-yellow-200/70 text-xs font-medium">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layer 2: Customer + speech bubble (mid ground) ── */}
      {/* The customer is clipped at the counter top: only head+torso visible */}
      <div className="absolute pointer-events-none z-10"
        style={{ bottom: '28%', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-end gap-8">
          {/* Overflow-hidden clips the legs below the counter line */}
          <div style={{ overflow: 'hidden', height: 148 }}>
            <CustomerCharacter />
          </div>
          <div className="mb-2 flex flex-col items-start gap-3">
            {/* Speech bubble */}
            <div className="relative bg-white rounded-2xl px-6 py-4 shadow-2xl border border-orange-100 max-w-xs">
              <div className="absolute -left-4 bottom-5 w-0 h-0"
                style={{ borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '18px solid white' }} />
              <p className="text-xl font-black text-gray-800 leading-tight">
                One <span className="text-red-600">{order.name}</span>, please!
              </p>
              <p className="text-xs text-gray-500 mt-1">{order.description}</p>
            </div>

            {/* Order card or result box */}
            {!showPizzaBox ? (
              <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-orange-100 w-60">
                <p className="text-xs font-bold text-gray-400 text-center mb-2 uppercase tracking-wider">Order Preview</p>
                <div className="flex justify-center mb-2">
                  <PizzaPreview ingredients={order.ingredients} size={88} />
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {order.ingredients.map((ing) => (
                    <span key={ing} className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: INGREDIENT_COLORS[ing] }}>
                      {INGREDIENT_LABELS[ing]}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-orange-100 w-60 flex flex-col items-center">
                <PizzaBoxDetailed />
                {finalScore !== undefined && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Score</p>
                    <p className="text-5xl font-black mt-0.5"
                      style={{ color: finalScore >= 80 ? '#22c55e' : finalScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {finalScore}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{getScoreMessage(finalScore)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Layer 3: Counter surface — anchored to very bottom ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ height: '28%' }}>
        {/* Counter top surface (the flat top the player sees) */}
        <div className="absolute top-0 left-0 right-0 h-14"
          style={{ background: 'linear-gradient(180deg, #e8b84a 0%, #c89228 60%, #a87010 100%)', boxShadow: '0 -6px 24px rgba(0,0,0,0.6)' }}>
          <div className="absolute inset-0 opacity-15"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)' }} />
          {/* Counter edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-200/40" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-900/50" />
          {/* Wood grain lines */}
          {[15, 30, 48, 65, 80].map((pct) => (
            <div key={pct} className="absolute top-0 bottom-0 w-px opacity-10"
              style={{ left: `${pct}%`, background: 'linear-gradient(180deg, transparent, rgba(100,50,0,0.8), transparent)' }} />
          ))}
        </div>

        {/* Counter front panel */}
        <div className="absolute top-14 left-0 right-0 bottom-0"
          style={{ background: 'linear-gradient(180deg, #8B5010 0%, #6b3c0c 50%, #3d2008 100%)' }}>
          {/* Panel seams */}
          {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
            <div key={pct} className="absolute top-0 bottom-0 border-r border-amber-900/30"
              style={{ left: `${pct}%` }} />
          ))}
          <div className="absolute top-1/3 left-0 right-0 h-px bg-amber-700/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-amber-700/10" />
        </div>

        {/* Action button sitting on counter surface */}
        <div className="absolute top-2 left-0 right-0 flex justify-center z-30">
          {!showPizzaBox ? (
            <button
              id="order-accept-btn"
              onClick={onAccept}
              className={`flex items-center gap-2 px-12 py-3 text-white text-xl font-black rounded-full shadow-2xl transition-all duration-150 border-b-4 ${
                acceptHovered
                  ? 'bg-green-400 border-green-600 scale-110 shadow-green-500/40'
                  : 'bg-green-500 border-green-700'
              }`}
              style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.45)' }}
            >
              <CheckCircle className="w-6 h-6" />
              Accept Order
            </button>
          ) : (
            <button
              id="give-pizza-btn"
              onClick={onGivePizza}
              className={`flex items-center gap-2 px-12 py-3 text-white text-xl font-black rounded-full shadow-2xl transition-all duration-150 border-b-4 ${
                giveHovered
                  ? 'bg-red-400 border-red-600 scale-110 shadow-red-500/40'
                  : 'bg-red-500 border-red-700'
              }`}
              style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.45)' }}
            >
              Give Pizza to Customer!
            </button>
          )}
        </div>
      </div>

      {/* ── Cursor ── */}
      {handState.isTracking && (
        <div className="fixed pointer-events-none z-50"
          style={{ left: cursorScreenX - 18, top: cursorScreenY - 18, transition: 'left 0.04s linear, top 0.04s linear' }}>
          <div className={`w-9 h-9 rounded-full border-[3px] flex items-center justify-center transition-all duration-75 ${
            handState.isPinching
              ? 'bg-orange-400/80 border-orange-600 scale-75'
              : 'bg-orange-300/40 border-orange-500'
          }`}>
            {handState.isPinching && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>
      )}

      <WebcamPreview videoRef={videoRef as React.RefObject<HTMLVideoElement | null>} handState={handState} />
    </div>
  );
}

// ─── Background SVG components ────────────────────────────────────────────────

function BrickWall() {
  const rows = 8;
  const cols = 15;
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols + 1 }).map((_, col) => {
          const w = 100 / cols;
          const h = 100 / rows;
          const offset = row % 2 === 0 ? 0 : w / 2;
          const x = col * w - offset;
          const y = row * h;
          const shade = 18 + ((row * cols + col) % 7);
          return (
            <rect key={`${row}-${col}`}
              x={`${x + 0.3}%`} y={`${y + 0.3}%`}
              width={`${w - 0.6}%`} height={`${h - 0.6}%`}
              fill={`hsl(20deg 40% ${shade}%)`}
              rx="1" />
          );
        })
      )}
    </svg>
  );
}

function PendantLamps() {
  return (
    <>
      {[20, 50, 80].map((left) => (
        <div key={left} className="absolute top-0 z-10" style={{ left: `${left}%`, transform: 'translateX(-50%)' }}>
          {/* Wire */}
          <div className="w-0.5 bg-gray-600 mx-auto" style={{ height: 60 }} />
          {/* Shade */}
          <div className="w-14 h-7 bg-gray-800 rounded-b-full mx-auto border border-gray-700 flex items-end justify-center pb-1.5">
            <div className="w-9 h-2.5 rounded-full" style={{ background: 'radial-gradient(ellipse, #fffde7 0%, #fef08a 70%, transparent 100%)' }} />
          </div>
          {/* Light cone */}
          <div className="absolute" style={{ top: 68, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{
              width: 120, height: 140,
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,220,100,0.18) 0%, transparent 100%)',
              borderRadius: '50%',
              marginLeft: -45,
            }} />
          </div>
        </div>
      ))}
    </>
  );
}

function BackShelf() {
  return (
    <div className="relative mx-8">
      <div className="h-2.5 rounded" style={{ background: 'linear-gradient(180deg, #7a4010 0%, #5a2c08 100%)', boxShadow: '0 3px 10px rgba(0,0,0,0.6)' }} />
      <div className="flex items-end justify-around pt-1.5 px-2">
        <Bottle color="#b03020" height={50} label="Sauce" />
        <Bottle color="#d4a030" height={62} label="Oil" tall />
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full border-2 border-amber-800/50 mb-1"
            style={{ background: 'radial-gradient(circle at 35% 35%, #fff8e1, #d4b060)' }} />
        </div>
        <Bottle color="#2e7d32" height={48} label="Herbs" />
        <Bottle color="#1565c0" height={58} label="Water" tall />
        <div className="text-xl mb-1 opacity-60">🧄</div>
        <Bottle color="#6d3b10" height={44} label="Spice" />
      </div>
    </div>
  );
}

function Bottle({ color, height, label, tall: _tall }: { color: string; height: number; label: string; tall?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 opacity-75">
      <div className="w-1.5 h-3 rounded-t-sm" style={{ background: '#444' }} />
      <div className="w-6 rounded-t-xl" style={{
        height,
        background: `linear-gradient(135deg, ${color}cc 0%, ${color} 50%, ${color}88 100%)`,
        boxShadow: `inset -2px 0 6px rgba(0,0,0,0.35), inset 2px 0 3px rgba(255,255,255,0.12)`,
      }} />
      <span className="text-amber-200/40 text-[8px] font-medium">{label}</span>
    </div>
  );
}

// ─── Customer character ───────────────────────────────────────────────────────

function CustomerCharacter() {
  return (
    <svg width="110" height="230" viewBox="0 0 110 230" xmlns="http://www.w3.org/2000/svg">
      {/* Legs */}
      <rect x="28" y="162" width="22" height="62" rx="9" fill="#2c3e50" />
      <rect x="60" y="162" width="22" height="62" rx="9" fill="#2c3e50" />
      {/* Shoes */}
      <ellipse cx="39" cy="224" rx="16" ry="8" fill="#1a1a1a" />
      <ellipse cx="71" cy="224" rx="16" ry="8" fill="#1a1a1a" />
      {/* Body */}
      <rect x="20" y="98" width="70" height="70" rx="15" fill="#e74c3c" />
      {/* V-neck */}
      <path d="M46 98 L55 116 L64 98" fill="#c0392b" />
      {/* Shirt buttons */}
      <circle cx="55" cy="124" r="3.5" fill="#c0392b" />
      <circle cx="55" cy="138" r="3.5" fill="#c0392b" />
      <circle cx="55" cy="152" r="3.5" fill="#c0392b" />
      {/* Arms */}
      <rect x="-4" y="104" width="28" height="16" rx="8" fill="#e74c3c" />
      <rect x="86" y="104" width="28" height="16" rx="8" fill="#e74c3c" />
      {/* Hands */}
      <circle cx="0" cy="112" r="10" fill="#fde3c8" />
      <circle cx="110" cy="112" r="10" fill="#fde3c8" />
      {/* Neck */}
      <rect x="48" y="86" width="19" height="16" rx="5" fill="#fde3c8" />
      {/* Head */}
      <circle cx="57" cy="68" r="34" fill="#fde3c8" />
      {/* Ears */}
      <circle cx="23" cy="68" r="11" fill="#fde3c8" />
      <circle cx="91" cy="68" r="11" fill="#fde3c8" />
      <circle cx="23" cy="68" r="6" fill="#f4c2a1" />
      <circle cx="91" cy="68" r="6" fill="#f4c2a1" />
      {/* Hair */}
      <ellipse cx="57" cy="38" rx="34" ry="18" fill="#4a3010" />
      <rect x="23" y="38" width="68" height="16" fill="#4a3010" />
      {/* Eye whites */}
      <ellipse cx="46" cy="66" rx="7" ry="8" fill="white" />
      <ellipse cx="68" cy="66" rx="7" ry="8" fill="white" />
      {/* Irises */}
      <circle cx="46" cy="67" r="4.5" fill="#3d2b1f" />
      <circle cx="68" cy="67" r="4.5" fill="#3d2b1f" />
      {/* Pupils */}
      <circle cx="47" cy="66" r="2" fill="#111" />
      <circle cx="69" cy="66" r="2" fill="#111" />
      {/* Shine */}
      <circle cx="48.5" cy="64.5" r="1.5" fill="white" />
      <circle cx="70.5" cy="64.5" r="1.5" fill="white" />
      {/* Eyebrows */}
      <path d="M38 55 Q46 50 54 55" stroke="#4a3010" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M60 55 Q68 50 76 55" stroke="#4a3010" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <ellipse cx="57" cy="74" rx="4" ry="3" fill="#f4b89a" />
      {/* Smile */}
      <path d="M44 83 Q57 95 70 83" stroke="#c0745a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <circle cx="36" cy="78" r="8" fill="#ffb3a7" opacity="0.3" />
      <circle cx="78" cy="78" r="8" fill="#ffb3a7" opacity="0.3" />
    </svg>
  );
}

// ─── Pizza preview ────────────────────────────────────────────────────────────

export function PizzaPreview({ ingredients, size = 120 }: { ingredients: string[]; size?: number }) {
  const hasSauce = ingredients.includes('sauce');
  const hasCheese = ingredients.includes('cheese');
  const hasPepperoni = ingredients.includes('pepperoni');
  const hasMushroom = ingredients.includes('mushroom');
  const hasBasil = ingredients.includes('basil');
  const s = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx={s} cy={size - 3} rx={s * 0.8} ry={5} fill="rgba(0,0,0,0.15)" />
      <circle cx={s} cy={s} r={s * 0.92} fill="#c8883a" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <circle key={i}
          cx={s + s * 0.83 * Math.cos((deg * Math.PI) / 180)}
          cy={s + s * 0.83 * Math.sin((deg * Math.PI) / 180)}
          r={s * 0.055} fill="#b07020" />
      ))}
      <circle cx={s} cy={s} r={s * 0.8} fill="#f0c46a" />
      {hasSauce && <circle cx={s} cy={s} r={s * 0.68} fill="#c0392b" />}
      {hasCheese && <circle cx={s} cy={s} r={s * 0.6} fill="#f5a623" opacity="0.95" />}
      {hasPepperoni && <>
        <circle cx={s * 0.72} cy={s * 0.72} r={s * 0.12} fill="#8B1C13" />
        <circle cx={s * 1.28} cy={s * 0.7} r={s * 0.12} fill="#8B1C13" />
        <circle cx={s} cy={s * 1.3} r={s * 0.12} fill="#8B1C13" />
      </>}
      {hasMushroom && <>
        <ellipse cx={s * 0.68} cy={s * 1.12} rx={s * 0.11} ry={s * 0.07} fill="#8B6914" />
        <rect x={s * 0.65} y={s * 1.13} width={s * 0.06} height={s * 0.1} fill="#a07820" rx="1" />
        <ellipse cx={s * 1.32} cy={s * 0.88} rx={s * 0.11} ry={s * 0.07} fill="#8B6914" />
        <rect x={s * 1.29} y={s * 0.89} width={s * 0.06} height={s * 0.1} fill="#a07820" rx="1" />
      </>}
      {hasBasil && <>
        <ellipse cx={s * 0.85} cy={s * 0.78} rx={s * 0.1} ry={s * 0.055} fill="#27ae60" transform={`rotate(-35 ${s * 0.85} ${s * 0.78})`} />
        <ellipse cx={s * 1.15} cy={s * 1.18} rx={s * 0.1} ry={s * 0.055} fill="#27ae60" transform={`rotate(25 ${s * 1.15} ${s * 1.18})`} />
      </>}
    </svg>
  );
}

// ─── Pizza box ────────────────────────────────────────────────────────────────

function PizzaBoxDetailed() {
  return (
    <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lidShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,230,120,0.35)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="148" rx="87" ry="6" fill="rgba(0,0,0,0.2)" />
      {/* Box bottom */}
      <rect x="6" y="84" width="188" height="58" rx="3" fill="#b8721e" />
      <path d="M6 84 L0 90 L0 142 L6 142Z" fill="#8B5010" />
      <path d="M194 84 L200 90 L200 142 L194 142Z" fill="#8B5010" />
      <path d="M0 142 L200 142 L200 148 L0 148Z" fill="#7a4208" />
      <rect x="12" y="90" width="176" height="48" rx="2" fill="#c8832a" />
      {/* Pizza inside box */}
      <circle cx="100" cy="114" r="22" fill="#c8883a" />
      <circle cx="100" cy="114" r="18" fill="#f0c46a" />
      <circle cx="100" cy="114" r="15" fill="#c0392b" />
      <circle cx="100" cy="114" r="12" fill="#f5a623" opacity="0.9" />
      <circle cx="93" cy="108" r="4" fill="#8B1C13" />
      <circle cx="108" cy="106" r="4" fill="#8B1C13" />
      <circle cx="100" cy="120" r="4" fill="#8B1C13" />
      {/* Lid depth sides */}
      <path d="M6 14 L0 20 L0 86 L6 86Z" fill="#9a6010" />
      <path d="M194 14 L200 20 L200 86 L194 86Z" fill="#9a6010" />
      {/* Lid face */}
      <rect x="6" y="10" width="188" height="76" rx="4" fill="#e8a832" />
      <rect x="6" y="10" width="188" height="76" rx="4" fill="url(#lidShade)" />
      {/* Vent holes */}
      <circle cx="68" cy="34" r="3.5" fill="#c8832a" opacity="0.5" />
      <circle cx="100" cy="34" r="3.5" fill="#c8832a" opacity="0.5" />
      <circle cx="132" cy="34" r="3.5" fill="#c8832a" opacity="0.5" />
      {/* Fold crease */}
      <line x1="6" y1="56" x2="194" y2="56" stroke="#c8832a" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
      {/* Logo */}
      <rect x="42" y="12" width="116" height="40" rx="6" fill="rgba(255,255,255,0.2)" />
      <rect x="44" y="14" width="112" height="36" rx="5" fill="none" stroke="#c8832a" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
      <text x="100" y="37" textAnchor="middle" fill="#7a3a08" fontSize="13" fontWeight="900" fontFamily="system-ui,sans-serif">PIZZA MAKER</text>
      {/* Hinge */}
      <rect x="6" y="82" width="188" height="5" rx="2" fill="#c8832a" />
      {/* Side tabs */}
      <rect x="2" y="57" width="7" height="28" rx="2" fill="#d4952e" opacity="0.6" />
      <rect x="191" y="57" width="7" height="28" rx="2" fill="#d4952e" opacity="0.6" />
    </svg>
  );
}

function getScoreMessage(score: number): string {
  if (score >= 95) return 'Perfect! Absolutely flawless!';
  if (score >= 80) return 'Great job! Almost perfect!';
  if (score >= 60) return 'Not bad! Keep practicing!';
  if (score >= 40) return 'Could use some work...';
  return 'The customer seems... concerned.';
}
