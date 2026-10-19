// One Euro filter (Casiez, Roussel & Vogel, CHI 2012).
//
// Hand landmarks jitter by a few pixels even when the hand is still, which
// makes a dwell cursor tremble off its target. A fixed low-pass filter would
// fix the tremble but make fast movements lag; this one smooths heavily at low
// speed and lightly at high speed.

function alpha(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

export class OneEuroFilter {
  private x: number | null = null;
  private dx = 0;
  private lastMs = 0;

  constructor(
    /** Cutoff at rest, Hz. Lower = steadier cursor when holding still. */
    private readonly minCutoff: number,
    /** How fast the cutoff rises with speed. Higher = less lag on fast moves. */
    private readonly beta: number,
    private readonly derivativeCutoff = 1,
  ) {}

  filter(value: number, timestampMs: number): number {
    if (this.x === null) {
      this.x = value;
      this.lastMs = timestampMs;
      return value;
    }

    const dt = Math.max(1e-3, (timestampMs - this.lastMs) / 1000);
    this.lastMs = timestampMs;

    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.derivativeCutoff, dt) * (rawDx - this.dx);

    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }

  reset(): void {
    this.x = null;
    this.dx = 0;
  }
}
