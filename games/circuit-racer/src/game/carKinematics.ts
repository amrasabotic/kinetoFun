/**
 * Arcade top-down car physics. Deliberately NOT the Matter.js suspension
 * model forked from gesture-hill-adventure (vehiclePhysics.ts) — that model
 * simulates vertical wheel suspension for a *side-view* hill-climb vehicle,
 * which has no steering axis and doesn't apply to a top-down circuit racer.
 * This is a standard simple kinematic car model instead: position + heading
 * + speed, steered directly by input, no rigid-body engine needed.
 */

export interface CarKinematic {
  x: number;
  y: number;
  heading: number; // radians
  speed: number; // px/s, signed (negative = reverse)
}

export interface CarPhysicsParams {
  maxSpeed: number;
  accel: number;
  friction: number; // fraction of speed lost per second when coasting
  turnRate: number; // radians/s of steering authority at full speed
  boostMultiplier: number;
}

export const DEFAULT_CAR_PARAMS: CarPhysicsParams = {
  maxSpeed: 420,
  accel: 340,
  friction: 0.6,
  turnRate: 2.6,
  boostMultiplier: 1.45,
};

export function createCar(x: number, y: number, heading: number): CarKinematic {
  return { x, y, heading, speed: 0 };
}

/**
 * @param throttle -1 (brake/reverse) -> +1 (accelerate)
 * @param steer -1 (left) -> +1 (right)
 */
export function updateCar(
  car: CarKinematic,
  throttle: number,
  steer: number,
  boost: boolean,
  params: CarPhysicsParams,
  dt: number,
): void {
  const maxSpeed = boost ? params.maxSpeed * params.boostMultiplier : params.maxSpeed;
  const accel = boost ? params.accel * params.boostMultiplier : params.accel;

  car.speed += throttle * accel * dt;
  if (Math.abs(throttle) < 0.05) {
    car.speed *= Math.max(0, 1 - params.friction * dt);
  }
  car.speed = Math.max(-maxSpeed * 0.4, Math.min(maxSpeed, car.speed));

  // Steering authority ramps in as the car gets moving, and reverses
  // direction when reversing (matches real driving intuition).
  const speedFrac = Math.min(1, Math.abs(car.speed) / (maxSpeed * 0.3));
  const dir = car.speed < 0 ? -1 : 1;
  car.heading += steer * params.turnRate * speedFrac * dir * dt;

  car.x += Math.cos(car.heading) * car.speed * dt;
  car.y += Math.sin(car.heading) * car.speed * dt;
}
