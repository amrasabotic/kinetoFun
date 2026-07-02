export interface RunnerCamera {
  depthOffset: number; // world Z the camera is currently positioned at
  shake: number;
}

export function createCamera(): RunnerCamera {
  return { depthOffset: 0, shake: 0 };
}

export function updateCamera(cam: RunnerCamera, advanceZ: number, dt: number): void {
  cam.depthOffset += advanceZ;
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt * 0.006);
  }
}

export function addCameraShake(cam: RunnerCamera, amount: number): void {
  cam.shake = Math.min(1, cam.shake + amount);
}

/** World Z relative to the camera (what projection.ts expects as `relZ`). */
export function toRelativeZ(cam: RunnerCamera, worldZ: number): number {
  return worldZ - cam.depthOffset;
}
