// Game modes — each tweaks the survival rules. Endless is the primary mode.
export type ModeId = 'endless' | 'timeattack' | 'onelife' | 'headshots';

export interface ModeDef {
  id: ModeId;
  name: string;
  emoji: string;
  blurb: string;
  hearts: number;        // starting hearts
  timeLimitSec: number;  // 0 = no limit
  headshotsOnly: boolean;
}

export const MODES: ModeDef[] = [
  {
    id: 'endless', name: 'Endless Survival', emoji: '♾️',
    blurb: 'Survive endless waves of spear-throwing stickmen. Beat your high score.',
    hearts: 3, timeLimitSec: 0, headshotsOnly: false,
  },
  {
    id: 'timeattack', name: 'Time Attack', emoji: '⏱️',
    blurb: 'Score as high as you can in 3 minutes. The clock is your only enemy.',
    hearts: 3, timeLimitSec: 180, headshotsOnly: false,
  },
  {
    id: 'onelife', name: 'One Life', emoji: '💔',
    blurb: 'A single hit ends the run. How far can you get?',
    hearts: 1, timeLimitSec: 0, headshotsOnly: false,
  },
  {
    id: 'headshots', name: 'Headshots Only', emoji: '🎯',
    blurb: 'Only headshots defeat enemies. Body hits just stagger them.',
    hearts: 3, timeLimitSec: 0, headshotsOnly: true,
  },
];

export function getMode(id: ModeId): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
