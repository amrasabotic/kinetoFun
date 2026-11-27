import { lerp } from "../logic/motion";

/** Mixes two #RRGGBB colours, `amount` from 0 (all `from`) to 1 (all `to`). */
export function mix(from: string, to: string, amount: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const parts = [0, 1, 2].map((i) => Math.round(lerp(channel(from, i), channel(to, i), amount)));
  return `#${parts.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
