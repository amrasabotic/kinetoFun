/**
 * Lap tracking for circuit racing.
 * Tracks lap count, times, and race positions.
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
}

export interface LapTrackerState {
  cars: CarState[];
  finishLine: { x: number; y: number; radius: number };
  totalLaps: number;
  raceStartTime: number;
  raceFinishTime: number | null;
}

export function createLapTracker(
  totalLaps: number,
  finishLineX: number,
  finishLineY: number,
): LapTrackerState {
  return {
    cars: [],
    finishLine: { x: finishLineX, y: finishLineY, radius: 100 },
    totalLaps,
    raceStartTime: Date.now(),
    raceFinishTime: null,
  };
}

export function addCar(tracker: LapTrackerState, carId: string): void {
  tracker.cars.push({
    id: carId,
    lapCount: 0,
    lapStart: tracker.raceStartTime,
    bestLapTime: Infinity,
    currentLapTime: 0,
    totalTime: 0,
    finished: false,
    finishTime: null,
  });
}

export function updateCarPosition(
  tracker: LapTrackerState,
  carId: string,
  carX: number,
  carY: number,
  now: number,
): void {
  const car = tracker.cars.find((c) => c.id === carId);
  if (!car || car.finished) return;

  const dx = carX - tracker.finishLine.x;
  const dy = carY - tracker.finishLine.y;
  const distToFinish = Math.sqrt(dx * dx + dy * dy);

  // Detect lap completion (car crosses finish line)
  if (distToFinish < tracker.finishLine.radius) {
    const lapTime = now - car.lapStart;
    car.lapCount++;
    car.currentLapTime = lapTime;
    car.bestLapTime = Math.min(car.bestLapTime, lapTime);
    car.totalTime = now - tracker.raceStartTime;
    car.lapStart = now;

    // Check if race is finished
    if (car.lapCount >= tracker.totalLaps) {
      car.finished = true;
      car.finishTime = now - tracker.raceStartTime;
      if (!tracker.raceFinishTime) {
        tracker.raceFinishTime = now;
      }
    }
  }
}

export function getPositions(tracker: LapTrackerState): string[] {
  const sorted = [...tracker.cars].sort((a, b) => {
    // Finished cars first (by finish time)
    if (a.finished && b.finished) {
      return (a.finishTime ?? 0) - (b.finishTime ?? 0);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    // Unfinished: most laps first, then by time
    if (a.lapCount !== b.lapCount) return b.lapCount - a.lapCount;
    return b.totalTime - a.totalTime;
  });
  return sorted.map((c) => c.id);
}

export function getRaceFinished(tracker: LapTrackerState): boolean {
  return tracker.cars.some((c) => c.finished);
}
