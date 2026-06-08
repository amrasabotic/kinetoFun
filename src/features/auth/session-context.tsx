"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@/types";
import { authService } from "@/services";

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => User;
  signup: (displayName: string, email: string, password: string) => User;
  logout: () => void;
}

const STORAGE_KEY = "kinetofun.session";

const SessionContext = createContext<SessionState | null>(null);

/**
 * In-memory mock session, persisted to localStorage so a refresh keeps you
 * "signed in". No real auth happens here — see services/auth.service.ts.
 *
 * We seed the default mock user on first render so the portal feels complete
 * out of the box, then reconcile with localStorage after mount (which keeps
 * SSR and the first client render identical, avoiding hydration warnings).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.defaultUser());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "null") {
        setUser(null);
      } else if (raw) {
        setUser(JSON.parse(raw) as User);
      }
    } catch {
      // Ignore corrupt storage; keep the seeded default.
    }
  }, []);

  const persist = useCallback((next: User | null) => {
    setUser(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode); state still works in-memory.
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const next = authService.login(email, password);
      persist(next);
      return next;
    },
    [persist],
  );

  const signup = useCallback(
    (displayName: string, email: string, password: string) => {
      const next = authService.signup(displayName, email, password);
      persist(next);
      return next;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<SessionState>(
    () => ({ user, isAuthenticated: user !== null, login, signup, logout }),
    [user, login, signup, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
