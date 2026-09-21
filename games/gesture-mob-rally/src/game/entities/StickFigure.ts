import type { StickFigureUnit, Team } from '../../types';

export function makeUnit(): StickFigureUnit {
  return {
    id: 0,
    active: false,
    team: 'player',
    laneX: 0,
    depthZ: 0,
    height: 0,
    vx: 0,
    vz: 0,
    hp: 1,
    state: 'run',
    stateTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
    colorIndex: 0,
    hatId: null,
    capeId: null,
    auraId: null,
    formationSlotX: 0,
    formationSlotZ: 0,
  };
}

export function resetUnit(
  u: StickFigureUnit,
  team: Team,
  laneX: number,
  depthZ: number,
  colorIndex: number,
): void {
  u.active = true;
  u.team = team;
  u.laneX = laneX;
  u.depthZ = depthZ;
  u.height = 0;
  u.vx = 0;
  u.vz = 0;
  u.hp = 1;
  u.state = 'run';
  u.stateTimer = 0;
  u.colorIndex = colorIndex;
  u.formationSlotX = laneX;
  u.formationSlotZ = 0;
}
