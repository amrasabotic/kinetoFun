"use client";

// Owns the TV's side of pairing: create-or-restore a session, poll its status,
// roll the code over when it expires, and survive a flaky network.
//
// Polling (not WebSockets) on purpose — the project has no realtime layer, and
// a TV waiting on a QR code has no latency budget worth the complexity.

import { useCallback, useEffect, useState } from "react";
import type { TvSessionView } from "@/lib/tv/pairing";

/** What the TV keeps between reloads. The secret never leaves this device. */
export interface StoredTvSession {
  sessionId: string;
  pairingCode: string;
  tvSecret: string;
  expiresAt: string;
  joinUrl: string;
}

const SESSION_KEY = "kf_tv_session";
const DEVICE_KEY = "kf_tv_device";
const POLL_MS = 2000;
/** Cap on the backoff applied while the API is unreachable. */
const MAX_BACKOFF_MS = 15000;

export function readStoredTvSession(): StoredTvSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTvSession>;
    if (!parsed.sessionId || !parsed.pairingCode || !parsed.tvSecret) return null;
    return parsed as StoredTvSession;
  } catch {
    return null;
  }
}

export function clearStoredTvSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode / storage disabled — the TV just re-pairs on reload */
  }
}

function storeTvSession(session: StoredTvSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* non-fatal: pairing still works, it just won't survive a refresh */
  }
}

/**
 * A stable-ish identifier for this browser standing in for a TV. A real Pi will
 * pass its own key (KF-TV-001) via the `deviceKey` option instead.
 */
function resolveDeviceKey(explicit?: string | null): string {
  if (explicit) return explicit;
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const generated = `kf-tv-web-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_KEY, generated);
    return generated;
  } catch {
    return `kf-tv-web-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface TvSessionState {
  session: StoredTvSession | null;
  status: TvSessionView | "starting";
  /** Display name of the paired user, once the TV is allowed to see it. */
  userName: string | null;
  /** True while the API is unreachable and we're retrying. */
  reconnecting: boolean;
  /** Set only for failures the TV can't retry its way out of. */
  error: string | null;
  /** Seconds until the current code expires (0 once it has). */
  secondsLeft: number;
  /** Discard the current session and show a fresh code. */
  regenerate: () => void;
}

export function useTvSession(options: { deviceKey?: string | null } = {}): TvSessionState {
  const { deviceKey } = options;

  const [session, setSession] = useState<StoredTvSession | null>(null);
  const [status, setStatus] = useState<TvSessionView | "starting">("starting");
  const [userName, setUserName] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ticked once a second by the countdown effect; `secondsLeft` is derived from
  // it during render rather than stored, so nothing sets state on mount.
  const [now, setNow] = useState(() => Date.now());

  // Bumping this restarts the whole create/poll effect.
  const [generation, setGeneration] = useState(0);

  const regenerate = useCallback(() => {
    clearStoredTvSession();
    setSession(null);
    setUserName(null);
    setStatus("starting");
    setError(null);
    setGeneration((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    // The effect owns the live session: it is restored from storage on mount and
    // replaced whenever a code is retired. Keeping it in the closure (rather
    // than a ref synced during render) keeps the poll loop's view consistent.
    let current: StoredTvSession | null = readStoredTvSession();

    const schedule = (ms: number) => {
      if (cancelled) return;
      timer = setTimeout(() => void tick(), ms);
    };

    /** Ask the server for a brand-new pairing session. */
    async function create(): Promise<StoredTvSession | null> {
      const response = await fetch("/api/tv/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceKey: resolveDeviceKey(deviceKey) }),
        cache: "no-store",
      });

      if (!response.ok) {
        // 429 is transient (a TV hammering create); anything else is a real
        // server-side problem worth surfacing on screen.
        if (response.status === 429) return null;
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't reach KinetoFun.");
      }

      const created = (await response.json()) as StoredTvSession;
      storeTvSession(created);
      return created;
    }

    async function tick(): Promise<void> {
      if (cancelled) return;

      try {
        if (!current) {
          current = await create();
          if (cancelled) return;
          if (!current) {
            schedule(POLL_MS * 2);
            return;
          }
          setSession(current);
          setStatus("waiting");
        }

        const response = await fetch(
          `/api/tv/session/${encodeURIComponent(current.pairingCode)}`,
          { headers: { "x-tv-secret": current.tvSecret }, cache: "no-store" },
        );

        if (cancelled) return;

        // Any successful round-trip clears the reconnecting banner.
        failures = 0;
        setReconnecting(false);
        setError(null);

        const body = (await response.json().catch(() => ({}))) as {
          status?: TvSessionView;
          user?: { name?: string };
        };
        const next = response.status === 404 ? "not_found" : body.status ?? "not_found";

        // A code that can never be used again: drop it and start over so the TV
        // always has something scannable on screen.
        if (next === "not_found" || next === "expired" || next === "ended") {
          clearStoredTvSession();
          current = null;
          setSession(null);
          setUserName(null);
          setStatus("starting");
          schedule(200);
          return;
        }

        setStatus(next);
        if (body.user?.name) setUserName(body.user.name);

        // Paired — the page navigates away; stop polling.
        if (next === "authenticated" || next === "ready") return;

        schedule(POLL_MS);
      } catch (err) {
        if (cancelled) return;
        failures += 1;
        setReconnecting(true);
        if (err instanceof Error && failures >= 5) setError(err.message);
        // Back off so an offline TV isn't spinning on the network every 2s.
        schedule(Math.min(POLL_MS * 2 ** Math.min(failures, 4), MAX_BACKOFF_MS));
      }
    }

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deviceKey, generation]);

  // Drives the "code expires in…" line. Only the interval sets state; the
  // displayed value is derived below. The server is the authority on expiry —
  // this is purely what the TV shows.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const secondsLeft = session
    ? Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 1000))
    : 0;

  return { session, status, userName, reconnecting, error, secondsLeft, regenerate };
}
