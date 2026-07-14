/**
 * Lap tracking for circuit racing.
 *
 * Lap completion is detected via waypoint-index wraparound (car's nearest-
 * waypoint index jumps from near the END of the track's waypoint array back
 * to near the START), not proximity to a fixed finish-line point. A
 * proximity/radius check is fragile here: cars start clustered on a grid
 * right next to the start/finish line, so a car can drift a short distance
 * from its grid slot into the "finish zone" without ever actually
 * completing a lap. Wraparound requires the car's nearest-waypoint index to
 * have actually traversed most of the loop (>75% -> <25%) first, which a
 * few dozen pixels of starting-grid drift can never do.
 */

export interface CarState {
  id: string;
  lapCount: number;
  lapStart: number; // timestamp of current lap start
  bestLapTime: number;
  currentLapTime: number;
  totalTime: number;
  finished: boolean;
  finishTime: number | null;
  lastWaypointIdx: number;
}

export interface LapTrackerState {
  cars: CarState[];
  waypointCount: number;
  totalLaps: number;
  raceStartTime: number;
  raceFinishTime: number | null;
}

export function createLapTracker(
  totalLaps: number,
  waypointCount: number,
  raceStartTime: number = Date.now(),
): LapTrackerState {
  return {
    cars: [],
    waypointCount,
    totalLaps,
    raceStartTime,
    raceFinishTime: null,
  };
}

export function addCar(tracker: LapTrackerState, carId: string, initialWaypointIdx: number): void {
  tracker.cars.push({
    id: carId,
    lapCount: 0,
    lapStart: tracker.raceStartTime,
    bestLapTime: Infinity,
    currentLapTime: 0,
    totalTime: 0,
    finished: false,
    finishTime: null,
    lastWaypointIdx: initialWaypointIdx,
  });
}

export function updateCarPosition(
  tracker: LapTrackerState,
  carId: string,
  currentWaypointIdx: number,
  now: number,
): void {
  const car = tracker.cars.find((c) => c.id === carId);
  if (!car || car.finished) return;

  const n = tracker.waypointCount;
  const wrapped = car.lastWaypointIdx > n * 0.75 && currentWaypointIdx < n * 0.25;

  if (wrapped) {
    const lapTime = now - car.lapStart;
    car.lapCount++;
    car.currentLapTime = lapTime;
    car.bestLapTime = Math.min(car.bestLapTime, lapTime);
    car.totalTime = now - tracker.raceStartTime;
    car.lapStart = now;

    if (car.lapCount >= tracker.totalLaps) {
      car.finished = true;
      car.finishTime = now - tracker.raceStartTime;
      if (!tracker.raceFinishTime) {
        tracker.raceFinishTime = now;
      }
    }
  }
  car.lastWaypointIdx = currentWaypointIdx;
}

export function getPositions(tracker: LapTrackerState): string[] {
  const sorted = [...tracker.cars].sort((a, b) => {
    if (a.finished && b.finished) {
      return (a.finishTime ?? 0) - (b.finishTime ?? 0);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    if (a.lapCount !== b.lapCount) return b.lapCount - a.lapCount;
    return b.totalTime - a.totalTime;
  });
  return sorted.map((c) => c.id);
}

export function getRaceFinished(tracker: LapTrackerState): boolean {
  return tracker.cars.some((c) => c.finished);
}
