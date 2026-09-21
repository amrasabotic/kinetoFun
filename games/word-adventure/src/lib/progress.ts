const KEY = "wsa.progress.v1";

export function getUnlocked(): number {
  if (typeof window === "undefined") return 1;
  const v = Number(window.localStorage.getItem(KEY) ?? "1");
  return Number.isFinite(v) && v >= 1 ? v : 1;
}

export function unlockLevel(level: number) {
  if (typeof window === "undefined") return;
  const cur = getUnlocked();
  if (level > cur) window.localStorage.setItem(KEY, String(level));
}

export function isUnlocked(level: number): boolean {
  return level <= getUnlocked();
}
