/**
 * Short synthesised reward sounds. Synthesis avoids shipping audio files and
 * keeps the cost negligible on low-power TV hardware.
 */

type ChimeKind = "collectible" | "badge";

const NOTES: Record<ChimeKind, number[]> = {
  collectible: [659.25, 987.77],
  badge: [523.25, 659.25, 783.99, 1046.5],
};

let context: AudioContext | null = null;

export function playRewardChime(kind: ChimeKind): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    // Browsers may leave the context suspended until the page has had input.
    if (context.state === "suspended") void context.resume();

    const start = context.currentTime;
    NOTES[kind].forEach((freq, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      const t = start + i * 0.11;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(context!.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // Sound is decoration; never let it break the game.
  }
}
