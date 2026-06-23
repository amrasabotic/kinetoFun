import { ChefHat, BookOpen } from 'lucide-react';

interface LandingScreenProps {
  onPlay: () => void;
  onHowToPlay: () => void;
}

export default function LandingScreen({ onPlay, onHowToPlay }: LandingScreenProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 overflow-hidden flex flex-col items-center justify-center gap-8">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-200 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-300 rounded-full opacity-20 translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/4 right-10 w-40 h-40 bg-orange-200 rounded-full opacity-30" />
      <div className="absolute bottom-1/4 left-10 w-32 h-32 bg-red-100 rounded-full opacity-40" />

      {/* Header */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <ChefHat className="w-14 h-14 text-red-500" />
        </div>
        <h1
          className="text-8xl font-black text-red-600 tracking-tight"
          style={{ textShadow: '0 4px 12px rgba(220,38,38,0.2)' }}
        >
          Pizza Maker
        </h1>
        <p className="text-2xl text-orange-700 mt-3 font-semibold">
          Cook with your hands — no controller needed!
        </p>
      </div>

      {/* Pizza illustration */}
      <div className="relative z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-orange-300 opacity-30 blur-xl scale-110" />
          <PizzaIllustration />
        </div>
      </div>

      {/* Buttons */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <button
          onClick={onPlay}
          className="px-20 py-5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-4xl font-black rounded-full shadow-2xl shadow-red-300/60 transition-all duration-150 border-b-4 border-red-700"
          style={{ letterSpacing: '-0.5px' }}
        >
          PLAY
        </button>
        <button
          onClick={onHowToPlay}
          className="flex items-center gap-2 px-8 py-3 bg-white/80 hover:bg-white text-orange-700 text-lg font-bold rounded-full shadow-md border border-orange-200 transition-all duration-150"
        >
          <BookOpen className="w-5 h-5" />
          How to Play
        </button>
      </div>

      {/* Floating ingredient decorations */}
      <div className="absolute top-16 left-16 opacity-60 rotate-12">
        <TomatoIcon />
      </div>
      <div className="absolute top-24 right-20 opacity-50 -rotate-6">
        <MushroomIcon />
      </div>
      <div className="absolute bottom-28 left-20 opacity-50 rotate-6">
        <BasilIcon />
      </div>
      <div className="absolute bottom-32 right-16 opacity-60 -rotate-12">
        <PepperoniIcon />
      </div>
    </div>
  );
}

function PizzaIllustration() {
  return (
    <svg width="260" height="260" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="130" cy="245" rx="90" ry="12" fill="rgba(0,0,0,0.12)" />
      {/* Outer crust */}
      <circle cx="130" cy="128" r="118" fill="#c8883a" />
      {/* Crust texture */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
        <ellipse
          key={i}
          cx={130 + 106 * Math.cos((deg * Math.PI) / 180)}
          cy={128 + 106 * Math.sin((deg * Math.PI) / 180)}
          rx="9" ry="6"
          fill="#b87830"
          transform={`rotate(${deg} ${130 + 106 * Math.cos((deg * Math.PI) / 180)} ${128 + 106 * Math.sin((deg * Math.PI) / 180)})`}
        />
      ))}
      {/* Dough */}
      <circle cx="130" cy="128" r="105" fill="#f0c46a" />
      {/* Sauce */}
      <circle cx="130" cy="128" r="92" fill="#c0392b" />
      {/* Cheese blobs */}
      <circle cx="130" cy="128" r="82" fill="#f5a623" opacity="0.95" />
      <ellipse cx="108" cy="110" rx="22" ry="15" fill="#f7b731" opacity="0.7" transform="rotate(-20 108 110)" />
      <ellipse cx="152" cy="120" rx="20" ry="14" fill="#f7b731" opacity="0.7" transform="rotate(15 152 120)" />
      <ellipse cx="125" cy="148" rx="24" ry="13" fill="#f7b731" opacity="0.7" transform="rotate(-5 125 148)" />
      {/* Pepperoni */}
      <circle cx="110" cy="105" r="14" fill="#8B1C13" />
      <circle cx="150" cy="100" r="14" fill="#8B1C13" />
      <circle cx="130" cy="138" r="14" fill="#8B1C13" />
      <circle cx="100" cy="140" r="12" fill="#8B1C13" />
      <circle cx="158" cy="140" r="12" fill="#8B1C13" />
      {/* Pepperoni highlights */}
      <circle cx="107" cy="101" r="4" fill="#a02820" opacity="0.6" />
      <circle cx="147" cy="96" r="4" fill="#a02820" opacity="0.6" />
      <circle cx="127" cy="134" r="4" fill="#a02820" opacity="0.6" />
      {/* Basil leaves */}
      <ellipse cx="122" cy="118" rx="9" ry="5" fill="#27ae60" transform="rotate(-35 122 118)" />
      <ellipse cx="142" cy="155" rx="9" ry="5" fill="#27ae60" transform="rotate(25 142 155)" />
      <ellipse cx="165" cy="118" rx="8" ry="4.5" fill="#2ecc71" transform="rotate(-10 165 118)" />
      {/* Highlight/shine */}
      <ellipse cx="88" cy="82" rx="20" ry="10" fill="white" opacity="0.1" transform="rotate(-25 88 82)" />
    </svg>
  );
}

function TomatoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="28" r="17" fill="#e74c3c" />
      <ellipse cx="24" cy="28" rx="17" ry="17" fill="#e74c3c" />
      <path d="M24 11 C20 8 16 10 18 14 C20 12 22 12 24 11Z" fill="#27ae60" />
      <path d="M24 11 C28 8 32 10 30 14 C28 12 26 12 24 11Z" fill="#2ecc71" />
      <path d="M24 11 C24 8 26 7 26 11Z" fill="#27ae60" />
      <ellipse cx="19" cy="23" rx="5" ry="7" fill="#c0392b" opacity="0.4" transform="rotate(-20 19 23)" />
    </svg>
  );
}

function MushroomIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <ellipse cx="22" cy="18" rx="16" ry="12" fill="#8B6914" />
      <ellipse cx="22" cy="18" rx="13" ry="9" fill="#a07820" />
      <ellipse cx="16" cy="15" rx="4" ry="3" fill="#c8941c" opacity="0.5" />
      <rect x="18" y="26" width="8" height="12" rx="2" fill="#d4a843" />
      <rect x="18" y="27" width="8" height="2" fill="#c8941c" />
    </svg>
  );
}

function BasilIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <ellipse cx="20" cy="22" rx="12" ry="8" fill="#27ae60" transform="rotate(-15 20 22)" />
      <line x1="8" y1="22" x2="32" y2="22" stroke="#1e8449" strokeWidth="1.5" />
      <line x1="14" y1="18" x2="20" y2="26" stroke="#1e8449" strokeWidth="1" />
      <line x1="26" y1="18" x2="20" y2="26" stroke="#1e8449" strokeWidth="1" />
    </svg>
  );
}

function PepperoniIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="#922b21" />
      <circle cx="14" cy="15" r="3" fill="#7b241c" />
      <circle cx="26" cy="18" r="3" fill="#7b241c" />
      <circle cx="18" cy="26" r="3" fill="#7b241c" />
      <ellipse cx="13" cy="13" rx="5" ry="3" fill="#a93226" opacity="0.4" transform="rotate(-20 13 13)" />
    </svg>
  );
}
