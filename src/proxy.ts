// Route protection. In Next.js 16 the `middleware` convention was renamed to
// `proxy` (this file MUST be `proxy.ts`, not `middleware.ts`), and it runs on
// the Node.js runtime. Per the docs, the proxy performs only fast *optimistic*
// checks — it verifies the session token from the cookie (no database) and
// redirects. The authoritative check lives in the DAL / route handlers.

import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { verifyToken } from "@/lib/auth/jwt";

/** Pages that require an authenticated session. */
const PROTECTED_PREFIXES = ["/profile", "/settings"];
/** Auth pages a signed-in user should be bounced away from. */
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(authConfig.cookieName)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAuthed = Boolean(session?.sub);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Block unauthorized access (or expired tokens) on protected pages, keeping
  // the intended destination so we can return there after login.
  if (isProtected && !isAuthed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Don't show login/signup to someone who is already signed in.
  if (AUTH_PAGES.includes(pathname) && isAuthed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages except API routes, Next internals, and files with an
  // extension (e.g. /logo.png). Auth for API routes is enforced in-handler.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
