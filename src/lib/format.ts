/** Formatting helpers shared across pages. */

export function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function playersLabel(players: "single" | "multi" | "both"): string {
  switch (players) {
    case "single":
      return "Single Player";
    case "multi":
      return "Multiplayer";
    case "both":
      return "1-4 Players";
  }
}
