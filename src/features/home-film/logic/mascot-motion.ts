import type { MascotPose } from "../types";
import { TV_CUES } from "./hand-path";
import { SCENE_STARTS } from "./timeline";
import { bump, ease, lerp, progress, wobble } from "./motion";
import type { Gait } from "./walk";

/** The parts only the walking scenes move, at rest. */
const STILL_PARTS = { footLeft: 0, footRight: 0, hand2: 0, wave2: 0, lookX: 0, lookY: 0 } as const;

// Cues for the "hello" scene, in seconds from the start of the film.
export const HELLO_CUES = {
  rise: 0.1,
  land: 0.62,
  waveEnd: 2.3,
  winkIn: 1.4,
  winkOut: 1.95,
  decorIn: 0.7,
} as const;

/** Logo px the mascot starts below its place: enough to hide it under the screen's lower edge on every format. */
export const RISE_FROM = 960;

const WAVE_HZ = 2.6;

/** A wave of the hand at the wrist, opening and closing smoothly over the span. */
function waving(time: number, start: number, end: number, degrees: number, hz = WAVE_HZ) {
  const envelope = Math.min(progress(time, start, start + 0.18), 1 - progress(time, end - 0.3, end));
  return degrees * Math.sin(2 * Math.PI * hz * (time - start)) * envelope;
}

/** A wink that closes fast, holds, and opens a touch slower. */
function wink(time: number, start: number, end: number) {
  return ease.enter(progress(time, start, start + 0.12)) * (1 - ease.glide(progress(time, end - 0.18, end)));
}

/** Two arcs lighting one after the other, the way the logo's signal reads. */
function signals(time: number, at: readonly number[], rest: number) {
  const near = at.reduce((sum, t) => sum + bump(time, t, t + 0.45), 0);
  const far = at.reduce((sum, t) => sum + bump(time, t + 0.15, t + 0.6), 0);
  return { signalNear: Math.min(1, rest + (1 - rest) * near), signalFar: Math.min(1, rest + (1 - rest) * far) };
}

/** The "hello" scene: the mascot rises into view, lands with a squash, waves and winks. */
export function helloPose(time: number): MascotPose {
  const rise = progress(time, HELLO_CUES.rise, HELLO_CUES.land);
  const sinceLanding = time - HELLO_CUES.land;
  // Stretches while it travels, squashes on landing, then settles.
  const travelStretch = -0.55 * Math.sin(Math.PI * rise) * (rise < 1 ? 1 : 0);
  const landingSquash = sinceLanding > 0 ? 0.7 * wobble(sinceLanding, 2.4, 6) : 0;
  const wave = waving(time, HELLO_CUES.land - 0.05, HELLO_CUES.waveEnd, 17);
  return {
    wave,
    wink: wink(time, HELLO_CUES.winkIn, HELLO_CUES.winkOut),
    blink: 0,
    mouth: lerp(0.55, 1, ease.enter(progress(time, HELLO_CUES.land - 0.1, HELLO_CUES.land + 0.2))),
    antenna: -9 * wobble(sinceLanding, 2.2, 4) + wave * 0.28,
    ...signals(time, [0.75, 1.55], 0.3),
    bounce: RISE_FROM * (1 - ease.pop(rise)),
    squash: travelStretch + landingSquash,
    lean: wave * 0.12,
    decor: ease.enter(progress(time, HELLO_CUES.decorIn, HELLO_CUES.decorIn + 0.5)),
    ...STILL_PARTS,
  };
}

/**
 * The TV scene: idle while the child waves, then a jump and a wave back once
 * the cursor ring has filled. It runs on through the dive, where the logo's
 * decoration fades so the mascot can walk on its own.
 */
export function tvPose(time: number): MascotPose {
  const t = time - SCENE_STARTS.tv;
  const sinceDone = t - TV_CUES.dwellDone;
  const hop = sinceDone > 0 ? Math.sin(Math.PI * progress(sinceDone, 0, 0.42)) : 0;
  const landingSquash = sinceDone > 0.42 ? 0.5 * wobble(sinceDone - 0.42, 2.4, 6) : 0;
  const breathe = 0.04 * Math.sin(2 * Math.PI * 0.6 * t);
  const wave = waving(t, TV_CUES.dwellDone + 0.05, TV_CUES.dwellDone + 1.6, 19, 3);
  // Watches the cursor arrive: a slow blink once it settles.
  const blink = bump(t, 1.1, 1.32);
  return {
    wave,
    wink: wink(t, TV_CUES.dwellDone + 0.15, TV_CUES.dwellDone + 0.6),
    blink,
    mouth: lerp(0.75, 1, progress(t, TV_CUES.dwellDone - 0.1, TV_CUES.dwellDone + 0.05)),
    antenna: wave * 0.3 - 8 * wobble(sinceDone, 2.2, 4),
    ...signals(t, [TV_CUES.dwellDone], 0.3),
    bounce: -70 * hop,
    squash: breathe - 0.35 * hop + landingSquash,
    lean: wave * 0.1,
    decor: 1 - ease.glide(progress(time, SCENE_STARTS.dive, SCENE_STARTS.dive + 0.6)),
    ...STILL_PARTS,
  };
}

/** The mascot standing in a stop, `local` seconds in: breathing, a blink as it sets off, a little antenna sway. */
export function idlePose(local: number): MascotPose {
  return {
    wave: 0,
    wink: 0,
    blink: bump(local, 0.22, 0.4),
    mouth: 0.8,
    antenna: 3 * Math.sin(2 * Math.PI * 0.9 * local),
    signalNear: 0.3,
    signalFar: 0.3,
    bounce: 0,
    squash: 0.04 * Math.sin(2 * Math.PI * 0.6 * local),
    lean: 0,
    decor: 0,
    ...STILL_PARTS,
  };
}

/** Adds a walk to a pose; the antenna trails behind the rocking body. */
export function withGait(pose: MascotPose, gait: Gait): MascotPose {
  return {
    ...pose,
    bounce: pose.bounce + gait.bounce,
    squash: pose.squash + gait.squash,
    lean: pose.lean + gait.lean,
    antenna: pose.antenna - 1.6 * gait.lean,
    footLeft: gait.footLeft,
    footRight: gait.footRight,
  };
}

// Cues for the goodbye, in seconds from its start.
const BYE_CUES = {
  waveIn: 0.55,
  waveOut: 1.95,
  winkIn: 1.0,
  winkOut: 1.45,
  decorIn: 0.7,
  decorOut: 1.95,
  hop: 1.98,
  sink: 2.14,
  gone: 2.62,
} as const;

/**
 * The goodbye: having walked back to where it said hello, the mascot waves
 * with both hands, winks, then hops and sinks below the screen's edge, so
 * the last frame matches the first.
 */
export function byePose(local: number, gait: Gait): MascotPose {
  const wave = waving(local, BYE_CUES.waveIn, BYE_CUES.waveOut, 19, 2.8);
  const sink = progress(local, BYE_CUES.sink, BYE_CUES.gone);
  const lift = Math.sin(Math.PI * progress(local, BYE_CUES.hop, BYE_CUES.hop + 0.3));
  const decor = ease.enter(progress(local, BYE_CUES.decorIn, BYE_CUES.decorIn + 0.4)) * (1 - ease.leave(progress(local, BYE_CUES.decorOut, BYE_CUES.decorOut + 0.25)));
  return withGait(
    {
      wave,
      wink: wink(local, BYE_CUES.winkIn, BYE_CUES.winkOut),
      blink: 0,
      mouth: 1,
      antenna: wave * 0.3,
      ...signals(local, [BYE_CUES.waveIn, BYE_CUES.waveIn + 0.8], 0.3),
      bounce: -30 * lift + RISE_FROM * ease.leave(sink),
      squash: 0.04 * Math.sin(2 * Math.PI * 0.6 * local) - 0.3 * lift - 0.55 * Math.sin(Math.PI * sink),
      lean: wave * 0.1,
      decor,
      ...STILL_PARTS,
      hand2: 1,
      wave2: wave,
    },
    gait,
  );
}
