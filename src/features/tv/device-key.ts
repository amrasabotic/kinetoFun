// The key that tells the server which TV a pairing session belongs to. A kit
// opens /tvsetup?device=<KEY> once at boot, but in-app returns to pairing (for
// example after "Disconnect this TV") drop the query string. The key is
// therefore stored the first time it is seen, so every later pairing on this
// browser still identifies the unit.

export const DEVICE_KEY_STORAGE_KEY = "kf_tv_device";

/** The shape the kit's setup script accepts for a device key. */
const VALID_DEVICE_KEY = /^[A-Za-z0-9_-]{3,64}$/;

export type DeviceKeyStore = Pick<Storage, "getItem" | "setItem">;

function remember(store: DeviceKeyStore | null, key: string): void {
  try {
    store?.setItem(DEVICE_KEY_STORAGE_KEY, key);
  } catch {
    // Storage can be blocked; the key is still used for this pairing.
  }
}

/**
 * Picks the device key for a new pairing session.
 *
 * - A well-formed explicit key is stored and returned; the newest one replaces
 *   an older stored key.
 * - A malformed explicit key is returned as given and not stored, so the server
 *   rejects it instead of the browser keeping it for good.
 * - Without an explicit key, the stored key is reused, else a generated one is
 *   stored.
 * - Missing or throwing storage degrades to the explicit key, else a generated
 *   one.
 */
export function resolveDeviceKey(
  explicit: string | null | undefined,
  store: DeviceKeyStore | null,
  generate: () => string,
): string {
  if (explicit) {
    if (VALID_DEVICE_KEY.test(explicit)) remember(store, explicit);
    return explicit;
  }

  let stored: string | null = null;
  try {
    stored = store?.getItem(DEVICE_KEY_STORAGE_KEY) ?? null;
  } catch {
    stored = null;
  }
  if (stored) return stored;

  const generated = generate();
  remember(store, generated);
  return generated;
}
