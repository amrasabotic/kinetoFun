// Server-only barrel for the auth library.
//
// IMPORTANT: only import this (or any `@/lib/auth/*` module) from server code —
// Route Handlers, the proxy, the DAL, Server Components/Actions. It pulls in
// `node:crypto`, `next/headers`, and the filesystem; importing it from a Client
// Component will break the build. Client code talks to auth via `/api/auth/*`
// (see `@/services/auth.service`).

export { authConfig, cookieOptions } from "./config";
export { hashPassword, verifyPassword } from "./password";
export { signToken, verifyToken } from "./jwt";
export {
  createSession,
  destroySession,
  getSessionPayload,
} from "./session";
export { getCurrentUser, requireUser } from "./dal";
export { getUserRepository } from "./repository";
export type { NewUser, UserRepository } from "./repository";
export { toAuthUser } from "./serialize";
export { registerSchema, loginSchema, toFieldErrors } from "./validation";
