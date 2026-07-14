# services/

This layer is the **boundary to the backend**. It is being migrated from mock
data to real backends table-by-table. Pages import from here so the UI doesn't
change as each domain lands.

- `games.service` — **real (Supabase)**. `fetchGames`/`fetchGame` hit the public
  `/api/games` endpoints (server → `@/lib/data/games-repository` → Supabase) and
  pure selectors (`selectFeatured`, `selectByCategory`, `searchGames`, …) derive
  views. Consume via the `useGames()` hook in `@/features/games`.
- `auth.service` — **real**. Calls `/api/auth/*` (custom JWT; see `features/auth`
  and `lib/auth`). Maps `AuthUser` → the UI `User`.
- `leaderboardService` — still mock; derives rankings from raw scores in
  `src/mock`. Swap to a `scores` repository (same pattern as games) later.
- `profileService` — still mock; a user's scores, sessions, and aggregate stats.

Server-only data access lives in `@/lib/data` (e.g. `games-repository`) and
`@/lib/auth`; never import those from a Client Component.
