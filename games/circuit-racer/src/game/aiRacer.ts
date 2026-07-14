import type { CarKinematic } from './carKinematics';
import type { Track } from './track';

export interface AIDriver {
  targetIndex: number;
}

export function createAIDriver(track: Track, startX: number, startY: number): AIDriver {
  // Start targeting the waypoint just ahead of the car's spawn position.
  let nearest = 0;
  let bestDist = Infinity;
  for (let i = 0; i < track.waypoints.length; i++) {
    const wp = track.waypoints[i];
    const d = (wp.x - startX) ** 2 + (wp.y - startY) ** 2;
    if (d < bestDist) { bestDist = d; nearest = i; }
  }
  return { targetIndex: (nearest + 3) % track.waypoints.length };
}

const ARRIVE_DIST = 70;
const MAX_STEER_ANGLE = Math.PI / 3; // full steering authority at 60° off-target

/** Waypoint-follow steering: aim at the next target waypoint, advance when close. */
export function driveAI(
  driver: AIDriver,
  car: CarKinematic,
  track: Track,
): { throttle: number; steer: number } {
  const target = track.waypoints[driver.targetIndex];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);

  if (dist < ARRIVE_DIST) {
    driver.targetIndex = (driver.targetIndex + 1) % track.waypoints.length;
  }

  const desiredHeading = Math.atan2(dy, dx);
  let diff = desiredHeading - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const steer = Math.max(-1, Math.min(1, diff / MAX_STEER_ANGLE));
  // Ease off the throttle on sharp turns so AI cars don't spin out constantly.
  const throttle = 1 - Math.min(0.5, Math.abs(steer) * 0.5);

  return { throttle, steer };
}
