import type { BurstState, CursorState, MascotPose, PlayBox, Point } from "../../types";
import { mascotHeight } from "../mascot-space";
import { clamp, ease, progress } from "../motion";
import { boxPoint, glide, hop, shownBetween, sizeScale, tremor } from "./shared";

/** What the game tiles show, drawn by the screen. */
export const TILE_ICONS = ["ball", "star", "note", "apple", "letter", "rocket", "balloon", "puzzle"] as const;
export type TileIcon = (typeof TILE_ICONS)[number];

/** Two rows that slide in from opposite sides, rest, and slide on out. */
const ROWS = [{ heading: -1 }, { heading: 1 }] as const;
/** Columns that rest inside the play box; the tiles either side are only seen sliding through. */
const COLUMNS = 4;
const TILES_PER_ROW = COLUMNS + 4;
/** Space between tiles, as a share of a tile. */
const GAP = 0.14;
const LARGEST_TILE = 84;
const ENTER = { start: 0.05, end: 0.78 };
const LEAVE = { start: 2.3, end: 2.78 };

/** The tile the hand picks: hover, grow, hold until the ring fills, select. */
export const PICK = { row: 0, tile: 4, arrive: 1.2, fillFrom: 1.35, select: 2.05 } as const;
/** Screen units the resting tiles bob, so the wall stays alive while the hand picks. */
const BOB = 2.5;
const CURSOR = { in: 0.85, out: 2.45, enter: { u: 0.3, v: 0.95 } };

export type Tile = {
  x: number;
  y: number;
  size: number;
  scale: number;
  opacity: number;
  icon: TileIcon;
  /** Index into the screen's tile colours. */
  tone: number;
  /** 0 to 1 while the hand is on it. */
  hovered: number;
};

export type LibraryState = { tiles: Tile[]; bursts: BurstState[]; cursor: CursorState; look: Point };

/** The size of a tile on this play box: two rows fit above the mascot's head, and the columns across the box. */
export function tileSize(box: PlayBox) {
  const room = box.ground - mascotHeight(box.mascot) - box.y - 6;
  return Math.min(LARGEST_TILE * sizeScale(box), room / (2 + GAP), box.width / (COLUMNS + (COLUMNS - 1) * GAP));
}

function rowShift(row: number, local: number, box: PlayBox) {
  const enter = 1 - ease.enter(progress(local, ENTER.start, ENTER.end));
  const leave = ease.leave(progress(local, LEAVE.start, LEAVE.end));
  return ROWS[row].heading * (leave - enter) * 1.45 * box.width;
}

function tileCentre(row: number, index: number, local: number, box: PlayBox): Point {
  const size = tileSize(box);
  const pitch = size * (1 + GAP);
  const column = index - (TILES_PER_ROW - COLUMNS) / 2;
  return {
    x: box.x + box.width / 2 + (column - (COLUMNS - 1) / 2) * pitch + rowShift(row, local, box),
    y: box.y + 4 + size / 2 + row * pitch + BOB * sizeScale(box) * Math.sin(2 * Math.PI * 1.1 * local + index * 0.9 + row * 1.6),
  };
}

/** Library: rows of game tiles slide past, and the hand holds on one to pick it. */
export function libraryAt(local: number, box: PlayBox): LibraryState {
  const size = tileSize(box);
  const grow = ease.enter(progress(local, PICK.arrive - 0.08, PICK.arrive + 0.18));
  const tiles: Tile[] = [];
  ROWS.forEach((_, row) => {
    for (let i = 0; i < TILES_PER_ROW; i++) {
      const centre = tileCentre(row, i, local, box);
      // Tiles fade out as they cross the sides of the play box instead of running under the words.
      const fade = clamp((centre.x - box.x) / (size * 0.5), 0, 1) * clamp((box.x + box.width - centre.x) / (size * 0.5), 0, 1);
      if (fade <= 0) continue;
      const picked = row === PICK.row && i === PICK.tile;
      tiles.push({
        ...centre,
        size,
        scale: picked ? 1 + 0.2 * grow + 0.1 * hop(local, PICK.select, 0.3) : 1,
        opacity: fade,
        icon: TILE_ICONS[(i + row * 4) % TILE_ICONS.length],
        tone: (i * 2 + row) % 6,
        hovered: picked ? grow : 0,
      });
    }
  });

  const pick = tileCentre(PICK.row, PICK.tile, local, box);
  const point = local < PICK.arrive ? glide(local, CURSOR.in, PICK.arrive, boxPoint(box, CURSOR.enter.u, CURSOR.enter.v), pick, 30) : pick;
  const still = tremor(local);
  const cursor: CursorState = {
    point: { x: point.x + still.x, y: point.y + still.y },
    shown: shownBetween(local, CURSOR.in, CURSOR.out, 0.25, 0.25),
    fill: progress(local, PICK.fillFrom, PICK.select),
    swell: ease.enter(progress(local, PICK.select, PICK.select + 0.15)),
  };
  const bursts = local >= PICK.select ? [{ at: tileCentre(PICK.row, PICK.tile, PICK.select, box), amount: Math.min(1, (local - PICK.select) / 0.7) }] : [];
  return { tiles, bursts, cursor, look: local > ENTER.start + 0.3 ? pick : boxPoint(box, 0.5, 0.2) };
}

/** The mascot bops to the scrolling games, and hops when one is picked. */
export function libraryPose(pose: MascotPose, local: number): MascotPose {
  const groove = shownBetween(local, 0.85, PICK.select, 0.3, 0.2);
  const beat = Math.sin(2 * Math.PI * 1.7 * local);
  const picked = hop(local, PICK.select + 0.04, 0.38);
  return {
    ...pose,
    lean: pose.lean + 3.5 * beat * groove,
    bounce: pose.bounce - 9 * Math.abs(beat) * groove - 44 * picked,
    squash: pose.squash - 0.3 * picked,
    antenna: pose.antenna - 7 * beat * groove,
    mouth: Math.min(1, pose.mouth + picked),
    wave: pose.wave + 20 * picked,
    wink: hop(local, PICK.select + 0.05, 0.5),
  };
}
