const KEY = "cwb_progress_v1";

export function getCompleted(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function markCompleted(level: number) {
  if (typeof window === "undefined") return;
  const cur = new Set(getCompleted());
  cur.add(level);
  localStorage.setItem(KEY, JSON.stringify([...cur]));
}

export function isUnlocked(level: number): boolean {
  if (level === 1) return true;
  return getCompleted().includes(level - 1);
}
