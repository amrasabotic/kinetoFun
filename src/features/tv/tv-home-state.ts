// Remembers the TV home's tab and page so "Back" from a game lands where the player left.
const KEY = "kf_tv_home_query";

export function saveTvHomeQuery(query: string): void {
  try {
    window.sessionStorage.setItem(KEY, query);
  } catch {
    // Storage disabled: Back just opens the first tab.
  }
}

export function tvHomeHref(): string {
  try {
    return `/tvsetup/games${window.sessionStorage.getItem(KEY) ?? ""}`;
  } catch {
    return "/tvsetup/games";
  }
}
