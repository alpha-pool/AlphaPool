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
├── pages/          # Home, GameDetail, Profile, Community, Login
├── components/
│   ├── ui/         # Radix UI wrappers
│   ├── games/      # GameCard, TrackedGameCard, SpreadIndicator, SportsbookOdds
│   └── community/  # GroupChat, TeamAnalytics
└── lib/
    ├── dataClient.js        # Unified backend interface (selects backend via VITE_BACKEND)
    ├── AuthContext.jsx
    └── backends/
        ├── supabaseBackend.js   # Active backend
        └── base44Backend.js    # Legacy — kept for reference

supabase/
└── functions/
    ├── syncGames/index.ts   # ESPN NCAAB → upsert into games table
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
| `tracked_games` | User picks. Needs public SELECT policy. |
| `users` | Extended profiles. Optional — `auth.me()` falls back gracefully if row missing. |
| `group_messages` | Chat. Needs public SELECT policy. |

All tables need a public `SELECT` RLS policy: **Supabase → Authentication → Policies → [table] → New Policy**, expression `true`.

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

### Cron schedule (Supabase → Edge Functions → [fn] → Schedule)
| Function | Schedule |
|---|---|
| `syncGames` | Every 1-5 min during game windows |
| `syncSpreads` | Once weekly (Tuesday morning) |

### ESPN API notes
- Uses `groups=50` (all D1) + `groups=100` (NCAA tournament), deduplicated by event ID
- No API key required
- Returns today's games only

### Odds API notes
- Spreads should be synced **before games tip off** — live in-game lines will overwrite pre-game spreads
- Free tier: 500 req/month

## Known Issues / Gotchas
- Test users created directly in Supabase Auth dashboard won't have a `users` table row — this is handled gracefully
- `supabase/functions/` is the deploy source; `functions/` at root is a duplicate kept for reference

## External APIs

### ESPN (no key required)
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard
```

### The Odds API
- Sport key: `basketball_ncaab`
- Endpoint: `/v4/sports/basketball_ncaab/odds?markets=spreads`
