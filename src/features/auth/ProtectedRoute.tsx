"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";

/**
 * Client-side guard for pages that require authentication. While the session is
 * restoring it shows a fallback; once settled, an unauthenticated visitor is
 * sent to `/login?next=<current path>`. The proxy already blocks these routes
 * server-side — this is the in-app, no-flash counterpart and the place that
 * handles a token expiring mid-session.
 */
export function ProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, signedOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // A deliberate sign-out navigates on its own; redirecting here would override it.
    if (!isLoading && !isAuthenticated && !signedOut) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, signedOut, router, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            role="status"
            aria-label="Loading"
          />
        </div>
      )
    );
  }

  return <>{children}</>;
}
