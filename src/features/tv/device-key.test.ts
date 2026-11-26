import { describe, expect, it } from "vitest";
import { DEVICE_KEY_STORAGE_KEY, resolveDeviceKey, type DeviceKeyStore } from "./device-key";

function memoryStore(initial?: string): DeviceKeyStore & { value: () => string | null } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(DEVICE_KEY_STORAGE_KEY, initial);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    value: () => data.get(DEVICE_KEY_STORAGE_KEY) ?? null,
  };
}

const throwingStore: DeviceKeyStore = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

const generate = () => "kf-tv-web-generated";

describe("resolveDeviceKey with an explicit key", () => {
  it("stores and returns a well-formed key", () => {
    const store = memoryStore();
    expect(resolveDeviceKey("KF-TV-E2E-TEST", store, generate)).toBe("KF-TV-E2E-TEST");
    expect(store.value()).toBe("KF-TV-E2E-TEST");
  });

  it("replaces an older stored key with the newest explicit one", () => {
    const store = memoryStore("KF-TV-OLD");
    expect(resolveDeviceKey("KF-TV-NEW", store, generate)).toBe("KF-TV-NEW");
    expect(store.value()).toBe("KF-TV-NEW");
  });

  it("accepts the length limits of the kit rule", () => {
    const shortest = "abc";
    const longest = "a".repeat(64);
    expect(resolveDeviceKey(shortest, memoryStore(), generate)).toBe(shortest);
    const store = memoryStore();
    resolveDeviceKey(longest, store, generate);
    expect(store.value()).toBe(longest);
  });

  it("returns a malformed key as given and does not store it", () => {
    for (const bad of ["a", "ab", "has space", "KF/TV/1", "x".repeat(65), "KF-TV-001\n"]) {
      const store = memoryStore("KF-TV-KEPT");
      expect(resolveDeviceKey(bad, store, generate)).toBe(bad);
      expect(store.value()).toBe("KF-TV-KEPT");
    }
  });

  it("does not store a malformed key when nothing was stored", () => {
    const store = memoryStore();
    resolveDeviceKey("a", store, generate);
    expect(store.value()).toBeNull();
  });
});

describe("resolveDeviceKey without an explicit key", () => {
  it("returns the stored key", () => {
    const store = memoryStore("KF-TV-E2E-TEST");
    expect(resolveDeviceKey(null, store, generate)).toBe("KF-TV-E2E-TEST");
    expect(resolveDeviceKey(undefined, store, generate)).toBe("KF-TV-E2E-TEST");
    expect(resolveDeviceKey("", store, generate)).toBe("KF-TV-E2E-TEST");
  });

  it("generates and stores a key when nothing is stored", () => {
    const store = memoryStore();
    expect(resolveDeviceKey(null, store, generate)).toBe("kf-tv-web-generated");
    expect(store.value()).toBe("kf-tv-web-generated");
  });

  it("does not generate again once a key is stored", () => {
    const store = memoryStore();
    let calls = 0;
    const counting = () => `kf-tv-web-${++calls}`;
    const first = resolveDeviceKey(null, store, counting);
    const second = resolveDeviceKey(null, store, counting);
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });
});

describe("resolveDeviceKey with unusable storage", () => {
  it("returns the explicit key when storage is missing or throws", () => {
    expect(resolveDeviceKey("KF-TV-001", null, generate)).toBe("KF-TV-001");
    expect(resolveDeviceKey("KF-TV-001", throwingStore, generate)).toBe("KF-TV-001");
  });

  it("returns a generated key when storage is missing or throws", () => {
    expect(resolveDeviceKey(null, null, generate)).toBe("kf-tv-web-generated");
    expect(resolveDeviceKey(null, throwingStore, generate)).toBe("kf-tv-web-generated");
  });
});
