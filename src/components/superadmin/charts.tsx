"use client";

// Lightweight, dependency-free SVG charts for the analytics dashboard.
// Responsive via viewBox; refined motion (path draw-in) and hover read-outs.

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface SeriesPoint {
  /** ISO date (YYYY-MM-DD) or any label. */
  date: string;
  value: number;
}

const W = 600;
const H = 200;
const PAD = { top: 16, right: 8, bottom: 24, left: 8 };

function niceMax(max: number): number {
  if (max <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / pow) * pow;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Smooth-ish area + line chart. */
export function AreaChart({
  data,
  color = "#7c3aed",
  className,
  valueLabel = "",
}: {
  data: SeriesPoint[];
  color?: string;
  className?: string;
  valueLabel?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const { line, area, points, max } = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
    const n = data.length;
    const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.value), d }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area =
      pts.length > 0
        ? `${line} L${pts[pts.length - 1]!.x},${PAD.top + innerH} L${pts[0]!.x},${PAD.top + innerH} Z`
        : "";
    return { line, area, points: pts, max };
  }, [data]);

  const baseline = PAD.top + (H - PAD.top - PAD.bottom);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + (H - PAD.top - PAD.bottom) * f}
            y2={PAD.top + (H - PAD.top - PAD.bottom) * f}
            stroke="#eef2f6"
            strokeWidth={1}
          />
        ))}

        <path d={area} fill={`url(#fill-${gid})`} className="kf-chart-area" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="kf-chart-line"
          pathLength={1}
        />

        {/* hover target columns */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - (W / Math.max(points.length, 1)) / 2}
            y={0}
            width={W / Math.max(points.length, 1)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hover !== null && points[hover] && (
          <>
            <line
              x1={points[hover]!.x}
              x2={points[hover]!.x}
              y1={PAD.top}
              y2={baseline}
              stroke={color}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            <circle cx={points[hover]!.x} cy={points[hover]!.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>

      {/* x-axis labels (first / mid / last) */}
      <div className="mt-1 flex justify-between px-1 text-[10px] font-medium text-slate-400">
        {data.length > 0 && <span>{shortDate(data[0]!.date)}</span>}
        {data.length > 2 && <span>{shortDate(data[Math.floor(data.length / 2)]!.date)}</span>}
        {data.length > 1 && <span>{shortDate(data[data.length - 1]!.date)}</span>}
      </div>

      {/* tooltip */}
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(points[hover]!.x / W) * 100}%`,
            top: `${(points[hover]!.y / H) * 100}%`,
          }}
        >
          <div className="font-bold text-slate-900">
            {points[hover]!.d.value.toLocaleString()}
            {valueLabel && <span className="ml-1 font-medium text-slate-400">{valueLabel}</span>}
          </div>
          <div className="text-[10px] text-slate-400">{shortDate(points[hover]!.d.date)}</div>
        </div>
      )}
    </div>
  );
}

/** Horizontal bar list — great for "most popular games". */
export function BarList({
  data,
  color = "#7c3aed",
}: {
  data: Array<{ label: string; value: number; sub?: string }>;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="group">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700">{d.label}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {d.value.toLocaleString()}
              {d.sub && <span className="ml-1 text-slate-400">{d.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
