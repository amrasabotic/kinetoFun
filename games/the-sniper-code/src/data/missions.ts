// Campaign data — pure parameters. The engine turns these into spawned actors.

export type EnvId = 'city' | 'park' | 'harbor' | 'station' | 'construction' | 'rooftop';

export interface EnvDef {
  id: EnvId;
  name: string;
  emoji: string;
  sky: [string, string, string]; // gradient top → horizon → low
  ground: string;
  haze: string;                  // distant building / horizon silhouette
  accent: string;                // prop / structure colour
}

export const ENVIRONMENTS: Record<EnvId, EnvDef> = {
  city: {
    id: 'city', name: 'Downtown', emoji: '🏙️',
    sky: ['#1b2a4a', '#3b5a86', '#88a6c9'], ground: '#3a4250', haze: '#243049', accent: '#5b6b86',
  },
  park: {
    id: 'park', name: 'Riverside Park', emoji: '🌳',
    sky: ['#1d3a52', '#3f7ea0', '#bfe3d2'], ground: '#2f6b3a', haze: '#27543a', accent: '#3f8f55',
  },
  harbor: {
    id: 'harbor', name: 'Old Harbor', emoji: '⚓',
    sky: ['#16263f', '#356073', '#9ec6cf'], ground: '#2a4b59', haze: '#1f3a44', accent: '#3d6b78',
  },
  station: {
    id: 'station', name: 'Central Station', emoji: '🚉',
    sky: ['#221a33', '#4a3b63', '#9b8bb5'], ground: '#3a3340', haze: '#2c2438', accent: '#6a5a82',
  },
  construction: {
    id: 'construction', name: 'Construction Site', emoji: '🏗️',
    sky: ['#2a2a3a', '#5a5168', '#c4b39a'], ground: '#5a4a38', haze: '#3a3242', accent: '#c2872b',
  },
  rooftop: {
    id: 'rooftop', name: 'City Rooftops', emoji: '🌃',
    sky: ['#0a0f24', '#1b2347', '#3a4a78'], ground: '#1a1f30', haze: '#10172e', accent: '#33406a',
  },
};

export type MissionType = 'eliminate' | 'civilian' | 'multi' | 'escape' | 'moving' | 'vip';

export interface MissionDef {
  id: string;
  index: number;
  name: string;
  env: EnvId;
  type: MissionType;
  objective: string;
  brief: string;
  timeSec: number;
  bullets: number;       // -1 = unlimited
  zoomStart: 0 | 1 | 2;  // index into ZOOM_LEVELS
  targets: number;
  targetScale: number;
  crowd: number;
  moveSpeed: number;     // world units/sec (escape/moving)
  requireOrder: boolean;
  decoys: number;
  night: boolean;
  fog: number;           // 0..1
  wind: number;          // -1..1 (bullet drift)
  star2: number;
  star3: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm01', index: 0, name: 'First Contact', env: 'city', type: 'eliminate',
    objective: 'Eliminate the marked suspect', brief: 'Find the suspect with the red marker and take the shot. Pinch your fingers to fire.',
    timeSec: 45, bullets: -1, zoomStart: 0, targets: 1, targetScale: 1.15, crowd: 2,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 200, star3: 320,
  },
  {
    id: 'm02', index: 1, name: 'Long Lens', env: 'city', type: 'eliminate',
    objective: 'Eliminate the suspect downtown', brief: 'The target is far away. Hold an open palm to zoom in before you fire.',
    timeSec: 45, bullets: 4, zoomStart: 0, targets: 1, targetScale: 0.95, crowd: 4,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 220, star3: 360,
  },
  {
    id: 'm03', index: 2, name: 'Crowd Control', env: 'park', type: 'civilian',
    objective: 'Hit ONLY the marked suspect', brief: 'The park is full of civilians. Shooting a civilian fails the mission. Stay calm and aim true.',
    timeSec: 40, bullets: 3, zoomStart: 0, targets: 1, targetScale: 1.0, crowd: 7,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 220, star3: 360,
  },
  {
    id: 'm04', index: 3, name: 'Three of a Kind', env: 'harbor', type: 'multi',
    objective: 'Eliminate all 3 suspects', brief: 'Three suspects are meeting at the harbor. Take them all down — any order.',
    timeSec: 50, bullets: 6, zoomStart: 0, targets: 3, targetScale: 1.0, crowd: 4,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 520, star3: 820,
  },
  {
    id: 'm05', index: 4, name: 'Last Train', env: 'station', type: 'escape',
    objective: 'Stop the suspect escaping', brief: 'The suspect will bolt for the exit. Drop them before they get away.',
    timeSec: 35, bullets: 4, zoomStart: 0, targets: 1, targetScale: 1.0, crowd: 5,
    moveSpeed: 150, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 240, star3: 400,
  },
  {
    id: 'm06', index: 5, name: 'On the Move', env: 'city', type: 'moving',
    objective: 'Eliminate the rider', brief: 'The target rides across on a scooter. Lead your shot — aim where they will be.',
    timeSec: 40, bullets: 5, zoomStart: 0, targets: 1, targetScale: 1.0, crowd: 4,
    moveSpeed: 190, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 240, star3: 400,
  },
  {
    id: 'm07', index: 6, name: 'Guardian', env: 'construction', type: 'vip',
    objective: 'Protect the VIP — stop the attacker', brief: 'An attacker (red) is closing on the VIP (cyan). Take the attacker down before contact. Do NOT shoot the VIP.',
    timeSec: 30, bullets: 4, zoomStart: 0, targets: 1, targetScale: 1.0, crowd: 4,
    moveSpeed: 95, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 240, star3: 420,
  },
  {
    id: 'm08', index: 7, name: 'Night Watch', env: 'rooftop', type: 'eliminate',
    objective: 'Eliminate the rooftop suspect', brief: 'Low light. The suspect peeks from cover, then hides. Be patient and steady your aim.',
    timeSec: 45, bullets: 4, zoomStart: 1, targets: 1, targetScale: 0.85, crowd: 2,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: true, fog: 0, wind: 0, star2: 240, star3: 420,
  },
  {
    id: 'm09', index: 8, name: 'Sea Fog', env: 'harbor', type: 'civilian',
    objective: 'Hit only the suspect in the fog', brief: 'Thick fog rolls in. Hold steady for STEADY AIM to see clearer and shoot truer.',
    timeSec: 42, bullets: 3, zoomStart: 1, targets: 1, targetScale: 0.95, crowd: 6,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0.55, wind: 0, star2: 240, star3: 420,
  },
  {
    id: 'm10', index: 9, name: 'Crosswind', env: 'park', type: 'moving',
    objective: 'Lead the rider in the wind', brief: 'A strong crosswind drags your shot. Watch the wind gauge and compensate.',
    timeSec: 40, bullets: 5, zoomStart: 1, targets: 1, targetScale: 1.0, crowd: 5,
    moveSpeed: 205, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0.6, star2: 260, star3: 440,
  },
  {
    id: 'm11', index: 10, name: 'Right Order', env: 'station', type: 'multi',
    objective: 'Eliminate suspects 1 → 2 → 3 in order', brief: 'Numbered suspects must fall in order. Decoys are mixed in — leave them alone.',
    timeSec: 45, bullets: 6, zoomStart: 1, targets: 3, targetScale: 0.95, crowd: 4,
    moveSpeed: 0, requireOrder: true, decoys: 2, night: false, fog: 0, wind: 0, star2: 560, star3: 880,
  },
  {
    id: 'm12', index: 11, name: 'Packed Plaza', env: 'city', type: 'civilian',
    objective: 'Hit the suspect — spare the crowd', brief: 'A dense crowd, few bullets, little time. One wrong shot ends it.',
    timeSec: 28, bullets: 2, zoomStart: 0, targets: 1, targetScale: 0.9, crowd: 10,
    moveSpeed: 0, requireOrder: false, decoys: 0, night: false, fog: 0, wind: 0, star2: 240, star3: 420,
  },
  {
    id: 'm13', index: 12, name: 'False Friend', env: 'construction', type: 'vip',
    objective: 'Stop the real attacker, not the decoy', brief: 'Night + wind. A decoy bodyguard looks dangerous but is harmless. Read the markers and protect the VIP.',
    timeSec: 30, bullets: 3, zoomStart: 1, targets: 1, targetScale: 0.95, crowd: 4,
    moveSpeed: 110, requireOrder: false, decoys: 1, night: true, fog: 0, wind: 0.45, star2: 260, star3: 440,
  },
  {
    id: 'm14', index: 13, name: 'The Sniper Code', env: 'rooftop', type: 'escape',
    objective: 'Final test — stop the runner', brief: 'Night, wind, a crowd, and barely any ammo. End it before the target escapes the rooftops.',
    timeSec: 32, bullets: 3, zoomStart: 1, targets: 1, targetScale: 0.85, crowd: 7,
    moveSpeed: 230, requireOrder: false, decoys: 1, night: true, fog: 0.25, wind: 0.55, star2: 300, star3: 500,
  },
];

export const ENV_ORDER: EnvId[] = ['city', 'park', 'harbor', 'station', 'construction', 'rooftop'];

/** Procedural mission for Endless mode — difficulty scales with the wave number. */
export function makeEndlessMission(wave: number): MissionDef {
  const env = ENV_ORDER[wave % ENV_ORDER.length];
  const ramp = Math.min(1, wave / 18);
  const moving = wave % 3 === 2;
  return {
    id: `endless-${wave}`,
    index: wave,
    name: `Wave ${wave + 1}`,
    env,
    type: moving ? 'moving' : 'civilian',
    objective: moving ? 'Lead and eliminate the rider' : 'Hit the suspect, spare the crowd',
    brief: '',
    timeSec: Math.max(14, 26 - Math.floor(ramp * 12)),
    bullets: moving ? 4 : 3,
    zoomStart: 0,
    targets: 1,
    targetScale: 1.05 - ramp * 0.35,
    crowd: 3 + Math.floor(ramp * 9),
    moveSpeed: moving ? 150 + ramp * 140 : 0,
    requireOrder: false,
    decoys: wave > 5 ? 1 : 0,
    night: wave % 4 === 3,
    fog: wave % 5 === 4 ? 0.4 : 0,
    wind: moving ? (Math.random() * 2 - 1) * ramp : 0,
    star2: 999999,
    star3: 999999,
  };
}
