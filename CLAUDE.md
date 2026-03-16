# AlphaPool — CLAUDE.md

## Project Overview
AlphaPool (branded "AlphaSpread") is a college sports spread tracking and community analytics platform. Users pick teams against the spread, earn "alpha points" based on cover margin, and compete on a group leaderboard.

## Tech Stack
- **Frontend:** React 18 + Vite, React Router 6, TanStack Query 5, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend:** Supabase (auth + database + edge functions)
- **Game data:** ESPN API (no key required)
- **Spread data:** The Odds API (free tier: 500 req/month)

## Project Structure
```
src/
├── pages/          # Home, GameDetail, Profile, Community, Login, AcceptInvite, Pools, PoolDetail, PoolJoin, Admin
├── components/
│   ├── ui/         # Radix UI wrappers
│   ├── games/      # GameCard, TrackedGameCard, SpreadIndicator, SportsbookOdds
│   └── community/  # GroupChat, TeamAnalytics
└── lib/
    ├── dataClient.js        # Unified backend interface (selects backend via VITE_BACKEND)
    ├── alpha.js             # computeCoverMargin, isGamePickable, generateInviteCode
    ├── leaderboard.js       # buildLeaderboard — shared by Community + PoolDetail
    ├── AuthContext.jsx
    └── backends/
        ├── supabaseBackend.js   # Active backend
        └── base44Backend.js    # Legacy — kept for reference

supabase/
└── functions/
    ├── syncGames/index.ts   # ESPN NCAAB → upsert games, auto-delete stale regular-season games
    └── syncSpreads/index.ts # The Odds API → update spread/spread_team
```

## Environment Variables
```env
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Supabase Tables
| Table | Notes |
|---|---|
| `games` | Populated by `syncGames`. Needs public SELECT policy. |
| `tracked_games` | User picks. Needs public SELECT policy. `game_id` FK must have ON DELETE CASCADE. |
| `users` | Extended profiles. Optional — `auth.me()` falls back gracefully if row missing. |
| `group_messages` | Chat. Needs public SELECT policy. |
| `pools` | March Madness pools. Needs public SELECT + authenticated INSERT. |
| `pool_members` | Pool membership. Needs public SELECT + authenticated INSERT. |

All tables need a public `SELECT` RLS policy: **Supabase → Authentication → Policies → [table] → New Policy**, expression `true`.

`pools` and `pool_members` also need an authenticated INSERT policy: `auth.role() = 'authenticated'`.

### tracked_games FK constraint
```sql
ALTER TABLE tracked_games
  DROP CONSTRAINT IF EXISTS tracked_games_game_id_fkey,
  ADD CONSTRAINT tracked_games_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
```

## Game Fields
```
id, external_id (ESPN event ID), sport
home_team, home_logo, home_score, home_seed
away_team, away_logo, away_score, away_seed
status (scheduled | live | final)
quarter, time_remaining, game_time
spread, spread_team (home | away)
conference, tournament_round, region, neutral_site
```

## Auth Flow
- Unauthenticated users → redirected to `/login`
- `/login` uses `supabase.auth.signInWithPassword` → on success calls `checkAppState()` then navigates to `/`
- `/accept-invite` — public route; parses Supabase invite tokens from URL hash, calls `setSession`, lets user set a password to complete account activation
- `auth.me()` fetches Supabase auth user + merges `users` table profile (graceful if no profile row)

## Edge Functions

### Deploying
```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy syncGames --no-verify-jwt
supabase functions deploy syncSpreads --no-verify-jwt
supabase secrets set ODDS_API_KEY=your_key_here
```

### Invoking manually
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/syncGames
curl -X POST https://<project-ref>.supabase.co/functions/v1/syncSpreads
```

### syncGames behavior
- Upserts today's ESPN games by `external_id`
- After upsert, deletes `final` games where `tournament_round IS NULL` and `external_id` not in today's ESPN response (stale regular-season cleanup)
- Guarded: skips cleanup if ESPN returns zero events (API outage protection)
- Response includes `deletedStale` count
- ESPN API only returns today's games — run daily so next day's games are seeded in time

### Cron schedule (pg_cron)
Requires `pg_cron` and `pg_net` extensions enabled (**Database → Extensions**).

| Job name | Schedule | Purpose |
|---|---|---|
| `sync-games-daily` | `0 10 * * *` (10am UTC / 6am ET) | Seeds next day's tournament games |
| `sync-games-live` | `*/5 17-23,0-4 * * *` | Live score updates during game windows |
| `syncSpreads` | Once weekly (Tuesday morning) | Refresh pre-game spreads |

```sql
-- View jobs
select jobname, schedule, active from cron.job;

-- View run history
select jobname, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 20;

-- Pause / resume
select cron.alter_job('sync-games-live', active := false);
select cron.alter_job('sync-games-live', active := true);
```

### ESPN API notes
- Uses `groups=50` (all D1) + `groups=100` (NCAA tournament), deduplicated by event ID
- No API key required
- Returns today's games only — ESPN does not expose future bracket games ahead of time

### Odds API notes
- Spreads should be synced **before games tip off** — live in-game lines will overwrite pre-game spreads
- Free tier: 500 req/month

## Pages & Routes

| Route | Page | Notes |
|---|---|---|
| `/` | `Home` | Tournament games only (filtered by `tournament_round IS NOT NULL`). My Picks + All Games tabs. |
| `/Community` | `Community` | Group leaderboard, chat, team analytics |
| `/Profile` | `Profile` | Per-user pick history and stats |
| `/Pools` | `Pools` | List pools, create, join via invite code |
| `/Pools/join` | `PoolJoin` | Join a pool by invite code (route must come before `/Pools/:poolId`) |
| `/Pools/:poolId` | `PoolDetail` | Pool-scoped leaderboard, tournament games only |
| `/Admin` | `Admin` | Delete scheduled games (gated by `ADMIN_EMAILS` constant) |
| `/login` | `Login` | Public |
| `/accept-invite` | `AcceptInvite` | Public — completes Supabase invite flow |

## Key Architecture Notes
- `src/lib/dataClient.js` → routes to `supabaseBackend.js`
- `src/lib/alpha.js` — single source for margin math and pick-locking logic
- `src/lib/leaderboard.js` — shared leaderboard builder used by Community + PoolDetail
- Home page and pool leaderboards scope to tournament games only (`tournament_round IS NOT NULL`)
- `Game.list()` returns all games ever synced (no date filter); ESPN sync only pushes today's games
- `tracked_games` uses `user_email` field (newer) with fallback to `created_by` (legacy) — always use `tg.user_email || tg.created_by` pattern

## Pool Feature
- Pool membership is additive — picks remain in flat `tracked_games`; pools just scope the leaderboard view
- Pool leaderboard filters to: member emails + `tournament_round IS NOT NULL`
- Invite flow: creator shares `/Pools/join?code=<invite_code>` → viewer joins and redirects to pool detail

## Admin Page
- Route: `/Admin`
- Gated by `ADMIN_EMAILS` constant in `src/pages/Admin.jsx`
- Lists all `scheduled` games with pick counts
- Confirmation dialog before deletion; cascade FK handles associated picks automatically

## Known Issues / Gotchas
- Test users created directly in Supabase Auth dashboard won't have a `users` table row — this is handled gracefully
- `supabase/functions/` is the deploy source; `functions/` at root is a duplicate kept for reference
- `tracked_games` requires a public SELECT RLS policy for the Community leaderboard to show all users' picks

## External APIs

### ESPN (no key required)
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard
```

### The Odds API
- Sport key: `basketball_ncaab`
- Endpoint: `/v4/sports/basketball_ncaab/odds?markets=spreads`
