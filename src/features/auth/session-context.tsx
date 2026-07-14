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
import { authService } from "@/services/auth.service";
import { invalidateFavorites } from "@/features/games/useFavorites";

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the initial session-restore (`/api/auth/me`) settles. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
  /** Revoke every session for the user ("sign out everywhere"). */
  logoutAll: () => Promise<void>;
  /** Permanently delete the account. Throws on failure (e.g. wrong password). */
  deleteAccount: (password: string) => Promise<void>;
  /** Re-fetch the current user from the server. */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

/**
 * Real, cookie-backed session. The JWT lives in an httpOnly cookie (invisible
 * to JS), so on mount we ask the server who we are via `/api/auth/me` — that's
 * the auto session-restore on refresh. `login`/`signup`/`logout` round-trip to
 * the API; the server sets/clears the cookie.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await authService.me());
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login(email, password);
    setUser(next);
    return next;
  }, []);

  const signup = useCallback(
    async (displayName: string, email: string, password: string) => {
      const next = await authService.register(displayName, email, password);
      setUser(next);
      return next;
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    invalidateFavorites();
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setUser(null);
    invalidateFavorites();
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await authService.deleteAccount(password);
    setUser(null);
    invalidateFavorites();
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      signup,
      logout,
      logoutAll,
      deleteAccount,
      refresh,
    }),
    [user, isLoading, login, signup, logout, logoutAll, deleteAccount, refresh],
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
