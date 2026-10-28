// Points from every level solved since the game was opened; reported once, when the player leaves.
let total = 0;

export function addLevelScore(points: number) {
  total += points;
}

export function hasSessionScore(): boolean {
  return total > 0;
}

/** Leaves to the platform: with the session's points if any level was solved, else as a plain exit. */
export function leaveGame() {
  const message = total > 0 ? { type: "GAME_COMPLETE", score: total } : { type: "GAME_EXIT" };
  window.parent.postMessage(message, "*");
}
