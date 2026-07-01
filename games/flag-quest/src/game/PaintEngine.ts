import type { ColorId, FlagDef, RegionRuntimeState } from '../types';
import { pointInPolygon } from '../utils/geometry';

const WRONG_DWELL_SEC = 0.28;
const FILL_RATE_PER_SEC = 0.9; // ~1.1s to fill a region at full speed

export interface PaintEngineEvents {
  onProgress?: (regionId: string, progress: number) => void;
  onRegionComplete?: (regionId: string) => void;
  onMistake?: (regionId: string) => void;
  onHoverColor?: (colorId: ColorId | null) => void;
}

export class PaintEngine {
  readonly states = new Map<string, RegionRuntimeState>();
  private wrongDwell = 0;
  private wrongRegionId: string | null = null;
  private slower: boolean;

  constructor(private flag: FlagDef, private events: PaintEngineEvents, slowerPainting = false) {
    for (const r of flag.regions) this.states.set(r.id, { state: 'empty', progress: 0 });
    this.slower = slowerPainting;
  }

  get isComplete(): boolean {
    return this.flag.regions.every((r) => this.states.get(r.id)?.state === 'complete');
  }

  get completedCount(): number {
    return this.flag.regions.filter((r) => this.states.get(r.id)?.state === 'complete').length;
  }

  /** Topmost incomplete region under the cursor (flag-local coords), or null. */
  private hitTest(x: number, y: number) {
    for (let i = this.flag.regions.length - 1; i >= 0; i--) {
      const r = this.flag.regions[i];
      if (this.states.get(r.id)?.state === 'complete') continue;
      if (pointInPolygon(x, y, r.points)) return r;
    }
    return null;
  }

  update(cursorLocal: { x: number; y: number } | null, selectedColor: ColorId | null, dtSec: number) {
    if (!cursorLocal || !selectedColor) {
      this.wrongDwell = 0;
      this.wrongRegionId = null;
      this.events.onHoverColor?.(null);
      return;
    }
    const hit = this.hitTest(cursorLocal.x, cursorLocal.y);
    if (!hit) {
      this.wrongDwell = 0;
      this.wrongRegionId = null;
      this.events.onHoverColor?.(null);
      return;
    }

    this.events.onHoverColor?.(hit.colorId);

    if (hit.colorId === selectedColor) {
      this.wrongDwell = 0;
      this.wrongRegionId = null;
      const cur = this.states.get(hit.id)!;
      const rate = this.slower ? FILL_RATE_PER_SEC * 0.6 : FILL_RATE_PER_SEC;
      const next = Math.min(1, cur.progress + rate * dtSec);
      this.states.set(hit.id, { state: next >= 1 ? 'complete' : 'filling', progress: next });
      this.events.onProgress?.(hit.id, next);
      if (next >= 1 && cur.progress < 1) this.events.onRegionComplete?.(hit.id);
    } else {
      if (this.wrongRegionId !== hit.id) {
        this.wrongRegionId = hit.id;
        this.wrongDwell = 0;
      }
      this.wrongDwell += dtSec;
      if (this.wrongDwell >= WRONG_DWELL_SEC) {
        this.wrongDwell = 0;
        const cur = this.states.get(hit.id)!;
        this.states.set(hit.id, { state: 'error', progress: cur.progress > 0 ? Math.max(0, cur.progress - 0.25) : 0 });
        this.events.onMistake?.(hit.id);
        window.setTimeout(() => {
          const now = this.states.get(hit.id);
          if (now && now.state === 'error') {
            this.states.set(hit.id, { state: now.progress > 0 ? 'filling' : 'empty', progress: now.progress });
          }
        }, 350);
      }
    }
  }

  revealHint(regionId: string) {
    const cur = this.states.get(regionId);
    if (cur && cur.state !== 'complete') {
      this.states.set(regionId, { state: 'filling', progress: Math.max(cur.progress, 0.15) });
    }
  }

}
