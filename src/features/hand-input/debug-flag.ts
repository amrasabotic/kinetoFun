// `?handdebug=1` switches the hand-tracking panel on. In-app navigation drops
// the query string, so the choice is kept for the browser session: the panel
// stays through the pairing redirect and page changes, and `?handdebug=0`
// turns it off again. The storage is passed in so the rules are testable
// without a browser.

export const DEBUG_FLAG_KEY = "kf_hand_debug";

export type DebugFlagStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** What the address asks for: `true` for `handdebug=1`, `false` for `handdebug=0`, else `null`. */
export function debugFlagFromAddress(search: string): boolean | null {
  const value = new URLSearchParams(search).get("handdebug");
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

/** The address wins when it says something; otherwise the remembered flag. */
export function isDebugOn(search: string, store: DebugFlagStore | null): boolean {
  const fromAddress = debugFlagFromAddress(search);
  if (fromAddress !== null) return fromAddress;
  try {
    return store?.getItem(DEBUG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remembers `handdebug=1` and forgets on `handdebug=0`; any other address writes nothing. */
export function rememberDebugFlag(search: string, store: DebugFlagStore | null): void {
  const fromAddress = debugFlagFromAddress(search);
  if (fromAddress === null || !store) return;
  try {
    if (fromAddress) store.setItem(DEBUG_FLAG_KEY, "1");
    else store.removeItem(DEBUG_FLAG_KEY);
  } catch {
    // Storage can be blocked (private mode, kiosk policy); the address still works.
  }
}
