/**
 * Stadium-shaped (rounded rectangle) closed-loop track: two straights joined
 * by two semicircle turns. Simple enough to generate procedurally, familiar
 * enough (running-track shape) to be instantly readable for kids.
 */

export interface TrackPoint {
  x: number;
  y: number;
}

export interface Track {
  waypoints: TrackPoint[]; // ordered, wraps back to [0] after the last point
  width: number;
  startPoint: TrackPoint;
  startHeading: number; // radians, direction of travel at the start line
}

const POINTS_PER_SEGMENT = 48;

export function buildOvalTrack(
  straightHalfLength = 900,
  turnRadius = 500,
  width = 320,
): Track {
  const waypoints: TrackPoint[] = [];
  const L = straightHalfLength;
  const R = turnRadius;

  // Bottom straight: (-L, R) -> (L, R), traveling in +x direction
  for (let i = 0; i < POINTS_PER_SEGMENT; i++) {
    const t = i / POINTS_PER_SEGMENT;
    waypoints.push({ x: -L + 2 * L * t, y: R });
  }
  // Right semicircle: center (L, 0). Must start at (L, R) — where the bottom
  // straight ends — and sweep down through (L+R, 0) to (L, -R). That's +90deg
  // down to -90deg, NOT -90deg up to +90deg (which starts at the wrong end
  // and creates a straight-line teleport at the segment boundary).
  for (let i = 0; i < POINTS_PER_SEGMENT; i++) {
    const t = i / POINTS_PER_SEGMENT;
    const angle = Math.PI / 2 - Math.PI * t;
    waypoints.push({ x: L + R * Math.cos(angle), y: R * Math.sin(angle) });
  }
  // Top straight: (L, -R) -> (-L, -R), traveling in -x direction
  for (let i = 0; i < POINTS_PER_SEGMENT; i++) {
    const t = i / POINTS_PER_SEGMENT;
    waypoints.push({ x: L - 2 * L * t, y: -R });
  }
  // Left semicircle: center (-L, 0). Must start at (-L, -R) — where the top
  // straight ends — and sweep through (-L-R, 0) to (-L, R), closing the loop
  // back into the bottom straight's start point.
  for (let i = 0; i < POINTS_PER_SEGMENT; i++) {
    const t = i / POINTS_PER_SEGMENT;
    const angle = -Math.PI / 2 - Math.PI * t;
    waypoints.push({ x: -L + R * Math.cos(angle), y: R * Math.sin(angle) });
  }

  // Start/finish line sits mid-way along the bottom straight, facing +x.
  const startPoint: TrackPoint = { x: 0, y: R };

  return { waypoints, width, startPoint, startHeading: 0 };
}

/** Index of the waypoint nearest a world position — cheap O(n) scan, fine for n≈192 and ≤4 cars. */
export function nearestWaypointIndex(track: Track, x: number, y: number): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < track.waypoints.length; i++) {
    const wp = track.waypoints[i];
    const dx = wp.x - x;
    const dy = wp.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Continuous progress metric (waypoint fraction) for live race-position ranking. */
export function trackProgress(track: Track, x: number, y: number): number {
  return nearestWaypointIndex(track, x, y) / track.waypoints.length;
}

/** Starting grid: player + up to 3 AI, staggered just behind the start line. */
export function startingGridPositions(track: Track, count: number): TrackPoint[] {
  const positions: TrackPoint[] = [];
  const spacing = 70;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    positions.push({
      x: track.startPoint.x - row * spacing - 40,
      y: track.startPoint.y + (col === 0 ? -50 : 50),
    });
  }
  return positions;
}
