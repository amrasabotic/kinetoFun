/**
 * Matter.js vehicle factory and physics driver.
 * Rear-wheel drive: torque applied to both wheels via angular velocity.
 */
import Matter from 'matter-js';
import type { Vehicle } from '../types';
import {
  CHASSIS_W, CHASSIS_H, CHASSIS_DENSITY, CHASSIS_FRICTION,
  CHASSIS_AIR_FRIC, CHASSIS_RESTITUT,
  WHEEL_R, WHEEL_DENSITY, WHEEL_FRICTION, WHEEL_AIR_FRIC, WHEEL_RESTITUT,
  WHEEL_BASE_X, WHEEL_BASE_Y,
  SUSP_STIFFNESS, SUSP_DAMPING, SUSP_LENGTH,
  ANTI_STIFFNESS, ANTI_DAMPING,
  MAX_WHEEL_SPIN, WHEEL_ACCEL,
  BOOST_FORCE,
  CAT_VEHICLE, CAT_TERRAIN, CAT_OBSTACLE,
} from '../constants/gameConfig';

const { Bodies, Constraint, Composite, Body } = Matter;

const vehicleFilter = {
  category: CAT_VEHICLE,
  mask:     CAT_TERRAIN | CAT_OBSTACLE,
};

export function createVehicle(
  world: Matter.World,
  startX: number,
  startY: number,
): Vehicle {
  // ── Chassis ────────────────────────────────────────────────────────────────
  const chassis = Bodies.rectangle(startX, startY, CHASSIS_W, CHASSIS_H, {
    label: 'chassis',
    density: CHASSIS_DENSITY,
    friction: CHASSIS_FRICTION,
    frictionAir: CHASSIS_AIR_FRIC,
    restitution: CHASSIS_RESTITUT,
    collisionFilter: vehicleFilter,
  });

  // ── Wheels ─────────────────────────────────────────────────────────────────
  const rearWheel = Bodies.circle(
    startX - WHEEL_BASE_X, startY + WHEEL_BASE_Y + SUSP_LENGTH * 0.5, WHEEL_R,
    {
      label: 'rearWheel',
      density: WHEEL_DENSITY,
      friction: WHEEL_FRICTION,
      frictionAir: WHEEL_AIR_FRIC,
      restitution: WHEEL_RESTITUT,
      collisionFilter: vehicleFilter,
    },
  );

  const frontWheel = Bodies.circle(
    startX + WHEEL_BASE_X, startY + WHEEL_BASE_Y + SUSP_LENGTH * 0.5, WHEEL_R,
    {
      label: 'frontWheel',
      density: WHEEL_DENSITY,
      friction: WHEEL_FRICTION,
      frictionAir: WHEEL_AIR_FRIC,
      restitution: WHEEL_RESTITUT,
      collisionFilter: vehicleFilter,
    },
  );

  // ── Suspension constraints ─────────────────────────────────────────────────
  // Primary spring (vertical axis of chassis ↔ wheel)
  const rearSuspension = Constraint.create({
    bodyA: chassis,
    bodyB: rearWheel,
    pointA: { x: -WHEEL_BASE_X, y: CHASSIS_H / 2 },
    pointB: { x: 0, y: 0 },
    length:    SUSP_LENGTH,
    stiffness: SUSP_STIFFNESS,
    damping:   SUSP_DAMPING,
  });

  const frontSuspension = Constraint.create({
    bodyA: chassis,
    bodyB: frontWheel,
    pointA: { x: WHEEL_BASE_X, y: CHASSIS_H / 2 },
    pointB: { x: 0, y: 0 },
    length:    SUSP_LENGTH,
    stiffness: SUSP_STIFFNESS,
    damping:   SUSP_DAMPING,
  });

  // Anti-sway: keep wheel from swinging too far forward/backward
  const rearAntiSway = Constraint.create({
    bodyA: chassis,
    bodyB: rearWheel,
    pointA: { x: -WHEEL_BASE_X, y: 0 },
    pointB: { x: 0, y: 0 },
    length:    SUSP_LENGTH + WHEEL_BASE_Y,
    stiffness: ANTI_STIFFNESS,
    damping:   ANTI_DAMPING,
  });

  const frontAntiSway = Constraint.create({
    bodyA: chassis,
    bodyB: frontWheel,
    pointA: { x: WHEEL_BASE_X, y: 0 },
    pointB: { x: 0, y: 0 },
    length:    SUSP_LENGTH + WHEEL_BASE_Y,
    stiffness: ANTI_STIFFNESS,
    damping:   ANTI_DAMPING,
  });

  Composite.add(world, [
    chassis, rearWheel, frontWheel,
    rearSuspension, frontSuspension,
    rearAntiSway, frontAntiSway,
  ]);

  return { chassis, frontWheel, rearWheel, frontSuspension, rearSuspension, frontAntiSway, rearAntiSway };
}

/**
 * Apply throttle, steering, and boost force to the vehicle every physics frame.
 * @param throttle -1 (full brake/reverse) → +1 (full accelerate)
 * @param steer -1 (full left) → +1 (full right)
 */
export function driveVehicle(
  vehicle:      Vehicle,
  throttle:     number,
  steer:        number,
  boostActive:  boolean,
  maxSpeed:     number,
  dt:           number = 0.016, // ~60fps
): void {
  const { rearWheel, frontWheel, chassis } = vehicle;

  // Determine current forward speed along chassis orientation
  const angle     = chassis.angle;
  const vx        = chassis.velocity.x;
  const vy        = chassis.velocity.y;
  const fwdSpeed  = vx * Math.cos(angle) + vy * Math.sin(angle);
  const speed     = Math.hypot(vx, vy);

  // Reduce torque as we approach max speed
  const speedFrac  = Math.max(0, 1 - speed / maxSpeed);
  const targetSpin = throttle * MAX_WHEEL_SPIN * speedFrac;

  // Smooth angular velocity change (no abrupt jumps)
  const rearAV  = rearWheel.angularVelocity;
  const frontAV = frontWheel.angularVelocity;
  const newRearAV  = rearAV  + (targetSpin - rearAV)  * WHEEL_ACCEL;
  const newFrontAV = frontAV + (targetSpin - frontAV) * WHEEL_ACCEL * 0.85;

  Body.setAngularVelocity(rearWheel,  Math.max(-MAX_WHEEL_SPIN, Math.min(MAX_WHEEL_SPIN, newRearAV)));
  Body.setAngularVelocity(frontWheel, Math.max(-MAX_WHEEL_SPIN, Math.min(MAX_WHEEL_SPIN, newFrontAV)));

  // Steering: apply angular velocity to chassis based on steering input
  // Only rotate when car has forward momentum
  const steerMagnitude = 0.08; // radians per second at max steering
  const steerFactor = Math.abs(fwdSpeed) / Math.max(1, maxSpeed); // reduce steering at low speed
  if (Math.abs(fwdSpeed) > 10) { // only steer if moving forward
    Body.rotate(chassis, steer * steerMagnitude * steerFactor * dt);
  }

  // Boost: lateral force along chassis heading
  if (boostActive) {
    Body.applyForce(chassis, chassis.position, {
      x:  Math.cos(angle) * BOOST_FORCE,
      y:  Math.sin(angle) * BOOST_FORCE,
    });
  }

  // Prevent excessive backwards roll when braking
  if (throttle < -0.1 && fwdSpeed < 0.5) {
    Body.setAngularVelocity(rearWheel,  0);
    Body.setAngularVelocity(frontWheel, 0);
  }
}

export function destroyVehicle(world: Matter.World, vehicle: Vehicle): void {
  Composite.remove(world, [
    vehicle.chassis, vehicle.frontWheel, vehicle.rearWheel,
    vehicle.frontSuspension as unknown as Matter.Body,
    vehicle.rearSuspension  as unknown as Matter.Body,
    vehicle.frontAntiSway   as unknown as Matter.Body,
    vehicle.rearAntiSway    as unknown as Matter.Body,
  ]);
}
