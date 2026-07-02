import HoverButton from '../common/HoverButton';

export default function HowToPlay({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#12101a] text-white flex flex-col items-center px-8 py-6 overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-lg mb-6">
        <h1 className="text-2xl font-extrabold">❔ How to Play</h1>
        <HoverButton onSelect={onBack} className="rounded-full overflow-hidden">
          <div className="px-4 py-1.5 bg-white/10 text-sm font-bold">Back</div>
        </HoverButton>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-4">
        <Row icon="🖐️" title="Move" desc="Move your open hand left and right — your crowd follows your wrist position." />
        <Row icon="✊" title="Charge Mode" desc="Make a fist and hold for half a second to unleash Charge Mode: your crowd glows, smashes obstacles, and defeats enemies faster for 3 seconds. 20s cooldown." />
        <Row icon="✋" title="Pause / Resume" desc="Hold an open palm still for 1 second to pause. Do it again to resume." />
        <Row icon="🚪" title="Gates" desc="Steer your crowd into a gate to apply its effect — +5, +10, x2, x3 and more. Missing every gate resets your combo." />
        <Row icon="🪓" title="Obstacles" desc="Rotating hammers, saw blades, crushers and more will thin your crowd if you don't dodge them — some can be smashed through during Charge Mode." />
        <Row icon="⚔️" title="Enemy Crowds" desc="Crash into a rival crowd to trigger an automatic 1-for-1 battle. The bigger crowd usually wins." />
        <Row icon="👑" title="Bosses & Castles" desc="Every 5th level ends in a boss fight. Every level ends with a castle — the more crowd you have left, the faster it falls." />
      </div>
    </div>
  );
}

function Row({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start p-4 rounded-xl bg-white/5">
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-white/60">{desc}</p>
      </div>
    </div>
  );
}
