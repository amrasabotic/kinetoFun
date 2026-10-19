"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";

/** Sends a TV that is not signed in back to pairing; returns true once signed in. */
export function useTvSignedIn(): boolean {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/tvsetup");
  }, [isLoading, isAuthenticated, router]);

  return !isLoading && isAuthenticated;
}
