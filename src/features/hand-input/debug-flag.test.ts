import { describe, expect, it } from "vitest";
import {
  DEBUG_FLAG_KEY,
  debugFlagFromAddress,
  isDebugOn,
  rememberDebugFlag,
  type DebugFlagStore,
} from "./debug-flag";

function memoryStore(initial: Record<string, string> = {}): DebugFlagStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const throwingStore: DebugFlagStore = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("debugFlagFromAddress", () => {
  it("reads 1 as on and 0 as off", () => {
    expect(debugFlagFromAddress("?handdebug=1")).toBe(true);
    expect(debugFlagFromAddress("?device=KF-1&handdebug=0")).toBe(false);
  });

  it("returns null when the flag is absent or has another value", () => {
    expect(debugFlagFromAddress("")).toBeNull();
    expect(debugFlagFromAddress("?device=KF-1")).toBeNull();
    expect(debugFlagFromAddress("?handdebug=yes")).toBeNull();
    expect(debugFlagFromAddress("?handdebug=")).toBeNull();
  });
});

describe("isDebugOn", () => {
  it("is on when the address says 1, with or without a stored flag", () => {
    expect(isDebugOn("?handdebug=1", memoryStore())).toBe(true);
    expect(isDebugOn("?handdebug=1", memoryStore({ [DEBUG_FLAG_KEY]: "1" }))).toBe(true);
  });

  it("is off when the address says 0, even with a stored flag", () => {
    expect(isDebugOn("?handdebug=0", memoryStore({ [DEBUG_FLAG_KEY]: "1" }))).toBe(false);
  });

  it("falls back to the stored flag when the address is silent", () => {
    expect(isDebugOn("", memoryStore({ [DEBUG_FLAG_KEY]: "1" }))).toBe(true);
    expect(isDebugOn("", memoryStore())).toBe(false);
  });

  it("ignores a stored value other than 1", () => {
    expect(isDebugOn("", memoryStore({ [DEBUG_FLAG_KEY]: "true" }))).toBe(false);
  });

  it("uses the address only when storage is missing or throws", () => {
    expect(isDebugOn("", null)).toBe(false);
    expect(isDebugOn("?handdebug=1", null)).toBe(true);
    expect(isDebugOn("", throwingStore)).toBe(false);
    expect(isDebugOn("?handdebug=1", throwingStore)).toBe(true);
  });
});

describe("rememberDebugFlag", () => {
  it("stores the flag on 1", () => {
    const store = memoryStore();
    rememberDebugFlag("?handdebug=1", store);
    expect(store.data.get(DEBUG_FLAG_KEY)).toBe("1");
  });

  it("removes the flag on 0", () => {
    const store = memoryStore({ [DEBUG_FLAG_KEY]: "1" });
    rememberDebugFlag("?handdebug=0", store);
    expect(store.data.has(DEBUG_FLAG_KEY)).toBe(false);
  });

  it("writes nothing when the address is silent or the value is unknown", () => {
    const store = memoryStore({ [DEBUG_FLAG_KEY]: "1" });
    rememberDebugFlag("", store);
    rememberDebugFlag("?handdebug=2", store);
    expect(store.data.get(DEBUG_FLAG_KEY)).toBe("1");

    const empty = memoryStore();
    rememberDebugFlag("?device=KF-1", empty);
    expect(empty.data.size).toBe(0);
  });

  it("does not throw when storage is missing or throws", () => {
    expect(() => rememberDebugFlag("?handdebug=1", null)).not.toThrow();
    expect(() => rememberDebugFlag("?handdebug=1", throwingStore)).not.toThrow();
    expect(() => rememberDebugFlag("?handdebug=0", throwingStore)).not.toThrow();
  });
});
