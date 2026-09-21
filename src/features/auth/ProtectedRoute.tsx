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
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

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
