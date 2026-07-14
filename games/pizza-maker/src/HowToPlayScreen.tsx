import { Hand, MousePointer2, GripHorizontal, ArrowLeft, Layers } from 'lucide-react';

interface HowToPlayScreenProps {
  onBack: () => void;
  onPlay: () => void;
}

export default function HowToPlayScreen({ onBack, onPlay }: HowToPlayScreenProps) {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header — compact */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-orange-200 bg-white/60 backdrop-blur-sm shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-black text-red-700">How to Play</h1>
        <div className="w-16" />
      </div>

      {/* Body — fixed height, no scroll */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 px-5 py-4">
        {/* Controls row */}
        <div className="grid grid-cols-3 gap-3">
          <ControlCard
            icon={<Hand className="w-7 h-7 text-orange-500" />}
            step="1"
            title="Camera Setup"
            description="Enable your webcam. Hold your open hand up — your index fingertip controls the cursor."
          />
          <ControlCard
            icon={<MousePointer2 className="w-7 h-7 text-orange-500" />}
            step="2"
            title="Two-Finger Click"
            description="Bring index and middle fingertips close together to click buttons or pick up ingredients."
          />
          <ControlCard
            icon={<GripHorizontal className="w-7 h-7 text-orange-500" />}
            step="3"
            title="Drag to Pizza"
            description="Keep fingers pinched while moving your hand to drag ingredients onto the pizza."
          />
        </div>

        {/* Game flow row */}
        <div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Game Flow
          </p>
          <div className="grid grid-cols-3 gap-3">
            <FlowStep color="bg-blue-500" number="1" title="Read the Order" description="A customer orders a pizza — check the speech bubble and the visual preview." />
            <FlowStep color="bg-orange-500" number="2" title="Build the Pizza" description="Drag sauce, cheese and toppings from the shelf onto the dough. The score updates live." />
            <FlowStep color="bg-green-500" number="3" title="Bake & Deliver" description='Hit "Bake Pizza" once satisfied (aim for 80%+) and hand it over!' />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-100/80 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-600 text-lg shrink-0">★</span>
          <p className="text-amber-700 text-xs leading-relaxed">
            <span className="font-black">Pro tip:</span> Dashed rings on the pizza show where layers go. The sidebar shows the target — sauce first, then cheese, then toppings. You don't need to touch every corner of the screen; the camera view is expanded so your natural range covers everything.
          </p>
        </div>

        {/* Play button */}
        <div className="flex justify-center mt-auto">
          <button
            onClick={onPlay}
            className="px-14 py-3.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-2xl font-black rounded-full shadow-xl shadow-red-200 border-b-4 border-red-700 transition-all duration-150"
          >
            Start Playing!
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlCard({ icon, step, title, description }: {
  icon: React.ReactNode; step: string; title: string; description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3.5 shadow-sm border border-orange-100 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-xs shrink-0">{step}</div>
        {icon}
      </div>
      <div>
        <p className="font-black text-gray-800 text-sm mb-0.5">{title}</p>
        <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FlowStep({ number, color, title, description }: {
  number: string; color: string; title: string; description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-start">
      <div className={`${color} text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shrink-0`}>{number}</div>
      <div>
        <p className="font-black text-gray-800 text-sm mb-0.5">{title}</p>
        <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
