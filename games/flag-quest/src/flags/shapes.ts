/**
 * Original, procedurally-generated flag geometry.
 * Every layout below is built from primitive shapes (rects, N-gons, triangles) computed
 * from well-known public-domain flag proportions — nothing here is traced or copied from
 * any third-party asset, SVG file, or image.
 */
import type { ColorId, FlagRegion } from '../types';

type Pt = [number, number];
let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function rectPoints(x: number, y: number, w: number, h: number): Pt[] {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export function trianglePoints(a: Pt, b: Pt, c: Pt): Pt[] {
  return [a, b, c];
}

/** Regular N-gon approximating a circle. */
export function circlePoints(cx: number, cy: number, r: number, sides = 40): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Half-disc (semicircle) polygon split at `angleDeg`, on the `side` (0 = first half, 1 = second half). */
export function halfDiscPoints(cx: number, cy: number, r: number, angleDeg: number, side: 0 | 1, sides = 24): Pt[] {
  const a0 = (angleDeg * Math.PI) / 180 + (side === 1 ? Math.PI : 0);
  const pts: Pt[] = [[cx, cy]];
  for (let i = 0; i <= sides; i++) {
    const a = a0 + (i / sides) * Math.PI;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** 5-point star polygon. */
export function starPoints(cx: number, cy: number, rOuter: number, rInner: number, points = 5): Pt[] {
  const pts: Pt[] = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + i * step;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** A thick straight band between two points (used for saltire diagonals / borders). */
export function thickLinePoints(x1: number, y1: number, x2: number, y2: number, thickness: number): Pt[] {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (thickness / 2);
  const ny = (dx / len) * (thickness / 2);
  return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
}

/** Rhombus (diamond) centered at cx,cy. */
export function diamondPoints(cx: number, cy: number, halfW: number, halfH: number): Pt[] {
  return [[cx, cy - halfH], [cx + halfW, cy], [cx, cy + halfH], [cx - halfW, cy]];
}

function region(colorId: ColorId, points: Pt[]): FlagRegion {
  return { id: nextId('r'), colorId, points };
}

// ── High-level layout generators ───────────────────────────────────────────

export function horizontalStripes(colors: ColorId[], w = 300, h = 200): FlagRegion[] {
  const bandH = h / colors.length;
  return colors.map((c, i) => region(c, rectPoints(0, i * bandH, w, bandH)));
}

export function verticalStripes(colors: ColorId[], w = 300, h = 200): FlagRegion[] {
  const bandW = w / colors.length;
  return colors.map((c, i) => region(c, rectPoints(i * bandW, 0, bandW, h)));
}

/** Horizontal stripes with relative weights, e.g. Colombia's 2:1:1. */
export function weightedHorizontalStripes(entries: [ColorId, number][], w = 300, h = 200): FlagRegion[] {
  const total = entries.reduce((s, [, wt]) => s + wt, 0);
  let y = 0;
  const out: FlagRegion[] = [];
  for (const [c, wt] of entries) {
    const bandH = (h * wt) / total;
    out.push(region(c, rectPoints(0, y, w, bandH)));
    y += bandH;
  }
  return out;
}

/** Vertical stripes with relative weights, e.g. Canada's 1:2:1. */
export function weightedVerticalStripes(entries: [ColorId, number][], w = 300, h = 200): FlagRegion[] {
  const total = entries.reduce((s, [, wt]) => s + wt, 0);
  let x = 0;
  const out: FlagRegion[] = [];
  for (const [c, wt] of entries) {
    const bandW = (w * wt) / total;
    out.push(region(c, rectPoints(x, 0, bandW, h)));
    x += bandW;
  }
  return out;
}

/** Field with a rectangular canton (flag + top-left inset block), e.g. Tonga, Chile. */
export function fieldWithCanton(
  fieldColor: ColorId,
  cantonColor: ColorId,
  cantonWFrac: number,
  cantonHFrac: number,
  w = 300,
  h = 200,
): FlagRegion[] {
  return [
    region(fieldColor, rectPoints(0, 0, w, h)),
    region(cantonColor, rectPoints(0, 0, w * cantonWFrac, h * cantonHFrac)),
  ];
}

/** Off-center circle on a solid field, e.g. Japan, Bangladesh, Palau. */
export function circleOnField(
  fieldColor: ColorId,
  circleColor: ColorId,
  cxFrac: number,
  cyFrac: number,
  rFrac: number,
  w = 300,
  h = 200,
): FlagRegion[] {
  return [
    region(fieldColor, rectPoints(0, 0, w, h)),
    region(circleColor, circlePoints(w * cxFrac, h * cyFrac, h * rFrac)),
  ];
}

/**
 * Nordic-style offset cross, one or two colors deep.
 * Pass `inner` for a double-fimbriated cross (e.g. Norway, Iceland).
 */
export function offsetCross(
  fieldColor: ColorId,
  crossColor: ColorId,
  vBarXFrac: number,
  barThickFrac: number,
  w = 300,
  h = 200,
  inner?: { color: ColorId; thickFrac: number },
): FlagRegion[] {
  const vBarX = w * vBarXFrac;
  const barH = h * barThickFrac;
  const barW = w * barThickFrac * (h / w) * (w / h); // keep proportional in flag space
  const cy = h / 2;
  const out: FlagRegion[] = [
    region(fieldColor, rectPoints(0, 0, w, h)),
    region(crossColor, rectPoints(0, cy - barH / 2, w, barH)),
    region(crossColor, rectPoints(vBarX - barW / 2, 0, barW, h)),
  ];
  if (inner) {
    const ih = h * inner.thickFrac;
    const iw = w * inner.thickFrac;
    out.push(region(inner.color, rectPoints(0, cy - ih / 2, w, ih)));
    out.push(region(inner.color, rectPoints(vBarX - iw / 2, 0, iw, h)));
  }
  return out;
}

/** Four triangles meeting at center (saltire quadrants), e.g. Jamaica. topBottom vs leftRight colors. */
export function saltireQuadrants(
  topBottomColor: ColorId,
  leftRightColor: ColorId,
  w = 300,
  h = 200,
): FlagRegion[] {
  const cx = w / 2, cy = h / 2;
  return [
    region(topBottomColor, trianglePoints([0, 0], [w, 0], [cx, cy])),
    region(topBottomColor, trianglePoints([0, h], [w, h], [cx, cy])),
    region(leftRightColor, trianglePoints([0, 0], [0, h], [cx, cy])),
    region(leftRightColor, trianglePoints([w, 0], [w, h], [cx, cy])),
  ];
}

/** Two diagonal bands (corner to corner) laid over a saltire quadrant base, e.g. Jamaica's yellow saltire. */
export function saltireBands(color: ColorId, thickness: number, w = 300, h = 200): FlagRegion[] {
  return [
    region(color, thickLinePoints(0, 0, w, h, thickness)),
    region(color, thickLinePoints(0, h, w, 0, thickness)),
  ];
}

export function trianglePolygonRegion(colorId: ColorId, a: Pt, b: Pt, c: Pt): FlagRegion {
  return region(colorId, trianglePoints(a, b, c));
}

export function rectRegion(colorId: ColorId, x: number, y: number, w: number, h: number): FlagRegion {
  return region(colorId, rectPoints(x, y, w, h));
}

export function circleRegion(colorId: ColorId, cx: number, cy: number, r: number, sides = 40): FlagRegion {
  return region(colorId, circlePoints(cx, cy, r, sides));
}

export function starRegion(colorId: ColorId, cx: number, cy: number, rOuter: number, rInner: number): FlagRegion {
  return region(colorId, starPoints(cx, cy, rOuter, rInner));
}

export function diamondRegion(colorId: ColorId, cx: number, cy: number, halfW: number, halfH: number): FlagRegion {
  return region(colorId, diamondPoints(cx, cy, halfW, halfH));
}

export function halfDiscRegion(colorId: ColorId, cx: number, cy: number, r: number, angleDeg: number, side: 0 | 1): FlagRegion {
  return region(colorId, halfDiscPoints(cx, cy, r, angleDeg, side));
}

export function bandRegion(colorId: ColorId, x1: number, y1: number, x2: number, y2: number, thickness: number): FlagRegion {
  return region(colorId, thickLinePoints(x1, y1, x2, y2, thickness));
}
