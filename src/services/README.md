# services/

This layer is the **boundary to the backend**. Today every method returns mock
data synchronously from `src/mock`. In Phase 2 the internals here will be
swapped for Supabase / API calls (likely becoming `async`), while pages and
components keep importing the same service functions — so the UI doesn't change
when the backend lands.

- `gamesService` — catalog browsing & lookup
- `leaderboardService` — derives rankings from raw scores
- `profileService` — a user's scores, sessions, and aggregate stats
- `authService` — mock login/signup (no real auth; see `features/auth`)
