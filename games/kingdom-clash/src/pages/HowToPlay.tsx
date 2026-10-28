import DwellButton from "@/components/DwellButton";

interface Props {
  cursor: { x: number; y: number } | null;
  onBack: () => void;
}

export default function HowToPlay({ cursor, onBack }: Props) {
  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(180deg,#0a1a0a 0%,#0d1f2d 100%)", fontFamily: "monospace" }}
    >
      <div className="flex items-center gap-4 px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #1a2a1a" }}>
        <DwellButton
          cursor={cursor}
          onActivate={onBack}
          className="px-3 py-1.5 [@media(max-height:760px)]:px-6 [@media(max-height:760px)]:py-3 [@media(max-height:760px)]:text-lg rounded text-sm border overflow-hidden"
          style={{ borderColor: "#333", color: "#888", background: "rgba(0,0,0,0.4)" }}
        >
          ← Back
        </DwellButton>
        <h1 className="text-3xl font-black tracking-widest" style={{ color: "#c0a855", textShadow: "0 0 16px rgba(192,168,85,0.4)" }}>
          HOW TO PLAY
        </h1>
      </div>

      {/* Short enough to fit with the Play button on one TV screen; nothing scrolls by hand. */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-5 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-4">
          <Block color="#00ccff" title="Hand Controls">
            <Row icon="☝️" label="Point" desc="The cursor follows your fingertip." />
            <Row icon="🤏" label="Pinch" desc="Pinch over a card to pick it up." />
            <Row icon="👋" label="Release" desc="Open your fingers on your half to send the unit there." />
            <Row icon="⏳" label="Hold" desc="Rest on a button for a moment to press it." />
          </Block>
          <Block color="#ffd700" title="Mana">
            <Row icon="💧" label="Cost" desc="Archer 2 · Knight 3 · Mage 4 · Giant 5. Mana refills by itself (max 10)." />
          </Block>
        </div>

        <div className="flex flex-col gap-4">
          <Block color="#c0a855" title="Battlefield">
            <Row icon="🏰" label="Enemy castle" desc="At the top. Destroy it to win." />
            <Row icon="🛡️" label="Your castle" desc="At the bottom. Protect it." />
          </Block>
          <Block color="#cc4444" title="Winning">
            <Row icon="✅" label="Victory" desc="Destroy the enemy castle or beat the whole wave." />
            <Row icon="⭐" label="Stars" desc="The more castle health you keep, the more stars." />
          </Block>
        </div>
      </div>

      <div className="flex justify-center pb-6 shrink-0">
        <DwellButton
          cursor={cursor}
          onActivate={onBack}
          className="px-16 py-5 rounded-xl text-3xl font-black tracking-widest border-2 overflow-hidden"
          style={{ borderColor: "#c0a855", color: "#1a1206", background: "linear-gradient(135deg,#e0c070,#c0a855)" }}
        >
          ▶ LET'S PLAY
        </DwellButton>
      </div>
    </div>
  );
}

function Block({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}28`, background: "rgba(0,0,0,0.3)" }}>
      <div className="px-3 py-1.5 text-sm font-bold tracking-widest" style={{ background: `${color}18`, color }}>{title}</div>
      <div className="px-3 py-2 flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xl shrink-0 leading-tight">{icon}</span>
      <div className="leading-snug">
        <span className="text-base font-bold text-white">{label} — </span>
        <span className="text-base text-gray-300">{desc}</span>
      </div>
    </div>
  );
}
