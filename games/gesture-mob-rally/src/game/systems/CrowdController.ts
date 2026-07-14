import type { StickFigureUnit } from '../../types';
import { FORMATION_UNIT_SPACING, FORMATION_MAX_COLUMNS, TRACK_HALF_WIDTH } from '../../constants/gameConfig';
import { clamp } from '../../utils/mathUtils';

export interface FormationSlot { x: number; z: number; }

/**
 * Computes a roughly-square block formation for `count` units so a growing
 * crowd reads as a block, not a blob. Front rows are z=0 (closest to camera
 * for the player crowd), later rows are increasingly negative z (further
 * from the anchor point, "behind" the front rank).
 */
export function computeFormationSlots(count: number): FormationSlot[] {
  if (count <= 0) return [];
  const cols = clamp(Math.ceil(Math.sqrt(count * 1.5)), 1, FORMATION_MAX_COLUMNS);
  const slots: FormationSlot[] = [];
  let i = 0;
  let row = 0;
  while (i < count) {
    const rowCount = Math.min(cols, count - i);
    for (let col = 0; col < rowCount; col++) {
      const xOffset = (col - (rowCount - 1) / 2) * FORMATION_UNIT_SPACING;
      const zOffset = -row * FORMATION_UNIT_SPACING;
      slots.push({ x: xOffset, z: zOffset });
      i++;
    }
    row++;
  }
  return slots;
}

/** Reassigns formation slots to every active unit of a team (called whenever team count changes). */
export function reassignFormation(units: StickFigureUnit[]): void {
  const slots = computeFormationSlots(units.length);
  for (let i = 0; i < units.length; i++) {
    units[i].formationSlotX = slots[i]?.x ?? 0;
    units[i].formationSlotZ = slots[i]?.z ?? 0;
  }
}

export function formationWidth(count: number): number {
  const cols = clamp(Math.ceil(Math.sqrt(count * 1.5)), 1, FORMATION_MAX_COLUMNS);
  return Math.min(cols * FORMATION_UNIT_SPACING, TRACK_HALF_WIDTH * 2);
}
