import type { HandData, NormalizedLandmark } from '@/types';
import { detectPinch, detectPalm, detectFist, detectThumbsUp, handSize } from './GestureDetector';

/* Landmark index used for smoothed hand position (middle-finger base) */
const POS_LM = 9;
const SMOOTH = 0.6;
const MAX_HIST = 22;

function makeHand(): HandData {
  return { x: -1, y: -1, vx: 0, vy: 0, visible: false, lm: null, hist: [], pinch: false, lastPinch: false, palm: false, fist: false, thumbUp: false };
}

function resetHand(h: HandData): void {
  h.x = -1; h.y = -1; h.vx = 0; h.vy = 0;
  h.visible = false; h.lm = null; h.hist = [];
  h.pinch = false; h.lastPinch = false; h.palm = false; h.fist = false; h.thumbUp = false;
  pinchOpenSince.delete(h);
}

// The camera loses a hand at its edges, so the middle of its view is stretched over the whole screen.
const reach = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

// A pinch survives a camera frame or two of open fingers, so a held item is not dropped by a flicker.
const PINCH_RELEASE_MS = 140;
const pinchOpenSince = new Map<HandData, number>();

function updateHand(h: HandData, lm: NormalizedLandmark[], W: number, H: number): void {
  const rx = reach(1 - lm[POS_LM].x, 0.12, 0.88) * W;
  const ry = reach(lm[POS_LM].y, 0.1, 0.75) * H;
  if (h.x < 0) { h.x = rx; h.y = ry; }
  const ox = h.x, oy = h.y;
  h.x = ox * SMOOTH + rx * (1 - SMOOTH);
  h.y = oy * SMOOTH + ry * (1 - SMOOTH);
  h.vx = h.x - ox; h.vy = h.y - oy;
  h.lm = lm; h.visible = true;
  h.hist.push({ x: h.x, y: h.y, t: performance.now() });
  if (h.hist.length > MAX_HIST) h.hist.shift();
  // lastPinch is advanced once per drawn frame by the game loop, so a pinch edge fires exactly once.
  const now = performance.now();
  if (detectPinch(lm, h.pinch)) { h.pinch = true; pinchOpenSince.delete(h); }
  else if (h.pinch) {
    const since = pinchOpenSince.get(h) ?? now;
    pinchOpenSince.set(h, since);
    if (now - since >= PINCH_RELEASE_MS) { h.pinch = false; pinchOpenSince.delete(h); }
  }
  h.palm = !h.pinch && detectPalm(lm);
  h.fist = detectFist(lm);
  h.thumbUp = detectThumbsUp(lm);
}

type HandResultsCallback = (hands: HandData[]) => void;

export class HandTracker {
  readonly hands: HandData[] = [makeHand(), makeHand()];
  private camWrap: HTMLDivElement | null = null;
  private vidEl: HTMLVideoElement | null = null;
  private skeletonCv: HTMLCanvasElement | null = null;
  private handsInstance: unknown = null;
  private cameraInstance: unknown = null;
  private running = false;
  private callbacks: HandResultsCallback[] = [];
  private reported = false;

  onUpdate(cb: HandResultsCallback): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    if (typeof window === 'undefined') return false;

    /* Wait up to 25 s for MediaPipe CDN scripts to load (they're afterInteractive) */
    const deadline = Date.now() + 25_000;
    const w = window as any;
    while ((typeof w.Hands === 'undefined' || typeof w.Camera === 'undefined') && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 150));
    }
    if (typeof w.Hands === 'undefined' || typeof w.Camera === 'undefined') return false;

    /* Build camera preview widget */
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;bottom:14px;right:14px;width:160px;height:120px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.25);z-index:500;background:#111;';
    const vid = document.createElement('video');
    vid.autoplay = true; vid.playsInline = true; vid.muted = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;';
    const skelCv = document.createElement('canvas');
    skelCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1);';
    const lbl = document.createElement('div');
    lbl.textContent = '👋 CHEF CAM';
    lbl.style.cssText = 'position:absolute;top:5px;left:7px;font-size:9px;color:rgba(255,255,255,.6);font-weight:700;letter-spacing:.5px;';
    wrap.append(vid, skelCv, lbl);
    document.body.appendChild(wrap);
    this.camWrap = wrap; this.vidEl = vid; this.skeletonCv = skelCv;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const hands = new w.Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
    hands.onResults((res: any) => this.processResults(res));
    this.handsInstance = hands;

    const cam = new w.Camera(vid, {
      onFrame: async () => { if (this.running) await hands.send({ image: vid }); },
      // 640x480 so a hand a few metres from a TV is still big enough to detect.
      width: 640, height: 480,
    });
    await cam.start();
    this.cameraInstance = cam;
    this.running = true;
    return true;
  }

  stop(): void {
    this.running = false;
    (this.cameraInstance as any)?.stop?.();
    (this.handsInstance as any)?.close?.();
    this.camWrap?.remove();
    this.camWrap = null; this.vidEl = null; this.skeletonCv = null;
    this.handsInstance = null; this.cameraInstance = null;
    resetHand(this.hands[0]); resetHand(this.hands[1]);
  }

  private processResults(res: any): void {
    const W = window.innerWidth, H = window.innerHeight;
    const cv = this.skeletonCv!;
    cv.width = cv.offsetWidth || 160; cv.height = cv.offsetHeight || 120;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);

    const detected = new Set<number>();

    let found: NormalizedLandmark[][] = (res.multiHandLandmarks ?? []).slice(0, 2);
    // The model sometimes reports one hand twice; two cursors on one hand confuse players.
    if (found.length === 2 && Math.hypot(found[0][9].x - found[1][9].x, found[0][9].y - found[1][9].y) < handSize(found[0]) * 0.6) {
      found = [found[0]];
    }

    if (found.length > 0) {
      found.forEach((lm: NormalizedLandmark[], i: number) => {
        const col = ['rgba(255,120,30,.9)', 'rgba(100,200,255,.9)'][i];
        if (typeof (window as any).drawConnectors !== 'undefined') {
          (window as any).drawConnectors(ctx, lm, (window as any).HAND_CONNECTIONS, { color: col, lineWidth: 1.5 });
          (window as any).drawLandmarks(ctx, lm, { color: '#fff', lineWidth: 1, radius: 2 });
        }
        updateHand(this.hands[i], lm as NormalizedLandmark[], W, H);
        detected.add(i);
      });
    }

    // Only fully reset hands that weren't detected this frame.
    // Keeping x/y/hist between frames is critical for velocity and gesture detection.
    if (!detected.has(0)) resetHand(this.hands[0]);
    if (!detected.has(1)) resetHand(this.hands[1]);

    // Report the game's own cursor so the platform's Back button follows it instead of drawing a second ring.
    const kf = window as unknown as { __kfPointer?: (x: number | null, y?: number) => void };
    const lead = this.bestHand();
    if (lead) kf.__kfPointer?.(lead.x / W, lead.y / H);
    else if (this.reported) kf.__kfPointer?.(null);
    this.reported = !!lead;

    this.callbacks.forEach(cb => cb(this.hands));
  }

  bestHand(): HandData | null {
    if (this.hands[0].visible && this.hands[1].visible) return this.hands[0];
    if (this.hands[0].visible) return this.hands[0];
    if (this.hands[1].visible) return this.hands[1];
    return null;
  }

  anyVisible(): boolean { return this.hands[0].visible || this.hands[1].visible; }
}

export const handTracker = new HandTracker();
