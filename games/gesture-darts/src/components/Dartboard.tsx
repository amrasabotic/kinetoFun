import { useMemo } from 'react';
import type { ThrowSnapshot } from '../types';
import { RADII, SECTOR_ORDER, SECTOR_WIDTH_DEG } from '../systems/dartboard';
import { lerp } from '../utils/helpers';

interface DartboardProps {
  throwState: ThrowSnapshot;
  turnDarts: { x: number; y: number }[];
  disabled: boolean; // true during the CPU's turn — hides the player's reticle
}

const VIEW = 200;
const CENTER = VIEW / 2;
const SCALE = VIEW / 2; // radius 1 (normalized) maps to 100px

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * SCALE * Math.sin(rad), y: CENTER - radius * SCALE * Math.cos(rad) };
}

/** Builds an SVG path for one annular sector wedge (a ring band within one 18° sector). */
function wedgePath(startAngle: number, endAngle: number, rInner: number, rOuter: number): string {
  const outerR = rOuter * SCALE;
  const innerR = rInner * SCALE;
  const p1 = polar(startAngle, rOuter);
  const p2 = polar(endAngle, rOuter);
  const p3 = polar(endAngle, rInner);
  const p4 = polar(startAngle, rInner);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  if (rInner <= 0) {
    return `M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
  }
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

const DARK = '#171310';
const LIGHT = '#e8dcc0';
const RED = '#b3242c';
const GREEN = '#1f7a3d';

export function Dartboard({ throwState, turnDarts, disabled }: DartboardProps) {
  const wedges = useMemo(() => {
    return SECTOR_ORDER.map((sector, i) => {
      const center = i * SECTOR_WIDTH_DEG;
      const start = center - SECTOR_WIDTH_DEG / 2;
      const end = center + SECTOR_WIDTH_DEG / 2;
      const alt = i % 2 === 0;
      return {
        sector,
        singleInner: { d: wedgePath(start, end, RADII.bullOuter, RADII.tripleInner), fill: alt ? LIGHT : DARK },
        triple: { d: wedgePath(start, end, RADII.tripleInner, RADII.tripleOuter), fill: alt ? GREEN : RED },
        singleOuter: { d: wedgePath(start, end, RADII.tripleOuter, RADII.doubleInner), fill: alt ? LIGHT : DARK },
        double: { d: wedgePath(start, end, RADII.doubleInner, RADII.doubleOuter), fill: alt ? GREEN : RED },
        labelPos: polar(center, 1.1),
      };
    });
  }, []);

  const showReticle = !disabled && (throwState.state === 'AIMING' || throwState.state === 'DRAWING');
  const showDartFlight = throwState.state === 'IN_FLIGHT';
  const showImpact = (throwState.state === 'IN_FLIGHT' || throwState.state === 'RESOLVED') && throwState.impact;

  const toPx = (v: number) => CENTER + v * SCALE;
  const dartX = throwState.impact
    ? lerp(toPx(throwState.aim.x), toPx(throwState.impact.x), throwState.flightProgress)
    : CENTER;
  const dartY = throwState.impact
    ? lerp(VIEW + 20, toPx(throwState.impact.y), throwState.flightProgress)
    : VIEW + 20;

  return (
    <div className="gdt-board-wrap">
      <svg className="gdt-board-svg" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {wedges.map((w) => (
          <g key={w.sector}>
            <path d={w.singleInner.d} fill={w.singleInner.fill} />
            <path d={w.triple.d} fill={w.triple.fill} />
            <path d={w.singleOuter.d} fill={w.singleOuter.fill} />
            <path d={w.double.d} fill={w.double.fill} />
            <text x={w.labelPos.x} y={w.labelPos.y} className="gdt-board-label" textAnchor="middle" dominantBaseline="middle">
              {w.sector}
            </text>
          </g>
        ))}
        <circle cx={CENTER} cy={CENTER} r={RADII.bullOuter * SCALE} fill={GREEN} />
        <circle cx={CENTER} cy={CENTER} r={RADII.doubleBullOuter * SCALE} fill={RED} />

        {turnDarts.map((d, i) => (
          <circle key={i} cx={toPx(d.x)} cy={toPx(d.y)} r={2.6} className="gdt-stuck-dart" />
        ))}

        {showImpact && throwState.impact && (
          <circle
            cx={toPx(throwState.impact.x)}
            cy={toPx(throwState.impact.y)}
            r={3}
            className="gdt-impact-mark"
            opacity={throwState.state === 'RESOLVED' ? 1 : throwState.flightProgress}
          />
        )}

        {showDartFlight && <circle cx={dartX} cy={dartY} r={2.4} className="gdt-dart-flight" />}

        {showReticle && (
          <g transform={`translate(${toPx(throwState.aim.x)}, ${toPx(throwState.aim.y)})`} className="gdt-reticle">
            <circle r={7} />
            <line x1={0} y1={-11} x2={0} y2={-4} />
            <line x1={0} y1={4} x2={0} y2={11} />
            <line x1={-11} y1={0} x2={-4} y2={0} />
            <line x1={4} y1={0} x2={11} y2={0} />
          </g>
        )}
      </svg>
    </div>
  );
}
