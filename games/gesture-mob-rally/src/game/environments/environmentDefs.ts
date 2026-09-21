import type { EnvironmentDef } from '../../types';

export const ENVIRONMENT_DEFS: EnvironmentDef[] = [
  {
    id: 'grassland', name: 'Grassland',
    skyTop: '#8FD3F4', skyBottom: '#E8FFC2',
    groundColor: '#4CAF50', groundLineColor: '#3C8C40',
    fogColor: '#CFF7C6', obstacleAccent: '#7A5230', castleColor: '#B0A99F',
    ambientParticleColor: '#FFFFFF',
    musicRootHz: 261.6, musicScale: [0, 2, 4, 7, 9], musicTempoMs: 420,
  },
  {
    id: 'desert', name: 'Desert',
    skyTop: '#FFD37A', skyBottom: '#FFF3D6',
    groundColor: '#E3B45C', groundLineColor: '#C7943C',
    fogColor: '#FFE9BC', obstacleAccent: '#8A5A2B', castleColor: '#D8B36A',
    ambientParticleColor: '#FFE9A8',
    musicRootHz: 293.7, musicScale: [0, 1, 4, 6, 9], musicTempoMs: 460,
  },
  {
    id: 'snow', name: 'Snow',
    skyTop: '#C9E7FF', skyBottom: '#F3FBFF',
    groundColor: '#E9F4FB', groundLineColor: '#BFDCEE',
    fogColor: '#FFFFFF', obstacleAccent: '#4C6A82', castleColor: '#E6EEF5',
    ambientParticleColor: '#FFFFFF',
    musicRootHz: 329.6, musicScale: [0, 2, 3, 7, 10], musicTempoMs: 400,
  },
  {
    id: 'volcano', name: 'Volcano',
    skyTop: '#3A1220', skyBottom: '#8C2A1F',
    groundColor: '#3E2723', groundLineColor: '#5D2A1D',
    fogColor: '#4A1010', obstacleAccent: '#FF6B35', castleColor: '#2D2320',
    ambientParticleColor: '#FF8A3D',
    musicRootHz: 220.0, musicScale: [0, 1, 3, 6, 8], musicTempoMs: 380,
  },
];

export function pickEnvironmentForLevel(levelIndex: number): EnvironmentDef {
  // Deterministic rotation with mild jitter — curated worlds, not fully random,
  // so variety appears immediately without per-level authoring.
  const jitter = (levelIndex * 7) % 3;
  const idx = (levelIndex + jitter) % ENVIRONMENT_DEFS.length;
  return ENVIRONMENT_DEFS[idx];
}

export function getEnvironment(id: string): EnvironmentDef {
  return ENVIRONMENT_DEFS.find((e) => e.id === id) ?? ENVIRONMENT_DEFS[0];
}
