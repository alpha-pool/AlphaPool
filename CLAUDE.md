# AlphaPool — CLAUDE.md

## Project Overview
AlphaPool (branded "AlphaSpread") is a college sports spread tracking and community analytics platform. Users pick teams against the spread, earn "alpha points" based on cover margin, and compete on a group leaderboard.

## Tech Stack
- **Frontend:** React 18 + Vite, React Router 6, TanStack Query 5, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend:** Base44 (BaaS — auth + database entities managed at base44.com)
- **Functions:** Deno serverless functions (in `functions/`)
- **Payments:** Stripe

## Key Architectural Notes
- Entity schemas (Game, TrackedGame, User, GroupMessage) are defined in the **Base44 cloud dashboard**, not in local files. To add/modify fields, go to base44.com and edit the entity there.
- All data fetching goes through `base44.entities.[Entity].*` via `src/api/base44Client.js`
- React Query handles caching; live games refetch every 15s, group chat every 10s

## Project Structure
```
src/
├── pages/          # Home, GameDetail, Profile, Community
├── components/
│   ├── ui/         # Radix UI wrappers
│   ├── games/      # GameCard, TrackedGameCard, SpreadIndicator, SportsbookOdds
│   └── community/  # GroupChat, TeamAnalytics
├── lib/            # AuthContext, QueryClient, app-params
└── api/            # base44Client.js

functions/
├── getAllTrackedGames.ts   # Existing: fetch all tracked games (service role)
├── syncGames.ts           # NEW: ESPN NCAAB → Game entity upsert
└── syncSpreads.ts         # NEW: The Odds API → spread/spread_team update
```

## Game Entity Fields
### Existing fields
```
id, home_team, away_team, home_logo, away_logo
home_score, away_score
status (scheduled | live | final)
quarter, time_remaining
spread, spread_team (home | away)
conference, week, game_time
```

### New fields (pending Base44 dashboard action — see checklist below)
```
external_id      Text     ESPN event ID, used as upsert key
sport            Text     "basketball" or "football"
tournament_round Text     "Round of 64", "Sweet 16", "Final Four", etc.
home_seed        Number   Tournament seed (null for regular season)
away_seed        Number   Tournament seed (null for regular season)
region           Text     "East", "West", "South", "Midwest"
neutral_site     Boolean  True for tournament games
```

---

## Active Feature: Live Game Data Ingestion (NCAAB / March Madness)

### Implementation Status
| Step | Status | Notes |
|---|---|---|
| 1. Add new fields to Game entity in Base44 | **PENDING (owner action)** | See checklist below |
| 2. `functions/syncGames.ts` | **DONE** | ESPN NCAAB → upsert by external_id |
| 3. `functions/syncSpreads.ts` | **DONE** | The Odds API → spread update |
| 4. Cron schedules on Base44 | **PENDING (owner action)** | See checklist below |
| 5. Home page filters (round/region) | **DONE** | Auto-switches to round filter during tournament |
| 6. GameCard + GameDetail tournament UI | **DONE** | Seeds, round, region, neutral site |

---

## Owner Checklist (actions required in Base44 dashboard)

### 1. Add fields to the Game entity
Go to **base44.com → your project → Entities → Game → Add Field** for each:

| Field name | Type |
|---|---|
| `external_id` | Text |
| `sport` | Text |
| `tournament_round` | Text |
| `home_seed` | Number |
| `away_seed` | Number |
| `region` | Text |
| `neutral_site` | True/False |

### 2. Add environment variable
Go to **base44.com → your project → Settings → Environment Variables**:
- Key: `ODDS_API_KEY`
- Value: your API key from [the-odds-api.com](https://the-odds-api.com) (free tier: 500 req/month)

### 3. Deploy the two new functions
Go to **base44.com → your project → Functions** and deploy:
- `functions/syncGames.ts`
- `functions/syncSpreads.ts`

### 4. Set up cron schedules
Go to **base44.com → your project → Functions → [function] → Schedule**:

| Function | Schedule | Notes |
|---|---|---|
| `syncGames` | Every 60s (or shortest available) | During March Madness game windows |
| `syncGames` | Every 15 min | Off-season / regular season |
| `syncSpreads` | Once daily | Tuesday morning recommended |

> If Base44 doesn't support sub-minute cron, run `syncGames` every 1 minute and it will handle multiple concurrent games fine — the ESPN endpoint returns all games for the day.

---

---

## Planned Feature: Backend Migration (Supabase)

### Strategy
Build a parallel Supabase backend on a separate branch while the friend continues working on `main` with Base44. An **abstraction layer** (`dataClient`) decouples pages from the backend so the swap is a single env var change.

### Branch
`migration/supabase` — diverges from `main`. UI changes from `main` can be merged in cleanly since pages/components don't change structure.

### Implementation Plan

#### Step 1 — Create abstraction layer
Build `src/lib/dataClient.js` as a unified interface that delegates to the active backend based on `VITE_BACKEND` env var.

```
src/lib/
├── dataClient.js          ← unified interface (auth + 4 entities + functions)
└── backends/
    ├── base44Backend.js   ← thin adapter wrapping existing base44 SDK calls
    └── supabaseBackend.js ← Supabase implementation (to be built)
```

Unified interface shape:
```js
// auth
dataClient.auth.me()
dataClient.auth.updateMe(data)
dataClient.auth.logout(url?)
dataClient.auth.redirectToLogin(url?)

// entities — same methods for Game, TrackedGame, User, GroupMessage
dataClient.Game.list(sortField?)
dataClient.Game.filter(query)
dataClient.Game.create(data)
dataClient.Game.update(id, data)
dataClient.Game.delete(id)

// functions
dataClient.functions.invoke(name, payload)
```

#### Step 2 — Migrate pages to use dataClient
Replace all direct `base44.*` imports with `dataClient.*`. Files to update:

| File | Calls to migrate |
|---|---|
| `src/pages/Home.jsx` | `auth.me`, `auth.redirectToLogin`, `Game.list`, `TrackedGame.filter`, `TrackedGame.create`, `TrackedGame.delete` |
| `src/pages/GameDetail.jsx` | `Game.list`, `TrackedGame.list` |
| `src/pages/Profile.jsx` | `auth.me`, `auth.redirectToLogin`, `auth.updateMe`, `User.list`, `TrackedGame.list`, `Game.list` |
| `src/pages/Community.jsx` | `auth.me`, `auth.redirectToLogin`, `Game.list`, `User.list`, `functions.invoke` |
| `src/components/community/GroupChat.jsx` | `GroupMessage.list`, `GroupMessage.create` |
| `src/lib/AuthContext.jsx` | **Full rewrite required** — uses `createAxiosClient` from `@base44/sdk` internals and `appParams.appId` directly; not just surface-level auth calls |
| `src/lib/PageNotFound.jsx` | `auth.me` |

#### Step 3 — Set up Supabase project
Actions in Supabase dashboard (supabase.com):
- Create project
- Create tables: `games`, `tracked_games`, `users`, `group_messages` (schema matches Game entity fields)
- Enable Row Level Security policies
- Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` for env vars

#### Step 4 — Build supabaseBackend.js
Implement the full dataClient interface using `@supabase/supabase-js`.

Auth mapping:
| dataClient | Supabase |
|---|---|
| `auth.me()` | `supabase.auth.getUser()` |
| `auth.updateMe(data)` | `supabase.auth.updateUser(data)` |
| `auth.logout()` | `supabase.auth.signOut()` |
| `auth.redirectToLogin()` | redirect to `/login` (custom auth page) |

Entity mapping:
| dataClient | Supabase |
|---|---|
| `Entity.list(sort?)` | `supabase.from('table').select('*').order(sort)` |
| `Entity.filter(query)` | `supabase.from('table').select('*').match(query)` |
| `Entity.create(data)` | `supabase.from('table').insert(data).select().single()` |
| `Entity.update(id, data)` | `supabase.from('table').update(data).eq('id', id)` |
| `Entity.delete(id)` | `supabase.from('table').delete().eq('id', id)` |

#### Step 5 — Migrate sync functions
Rewrite `functions/syncGames.ts` and `functions/syncSpreads.ts` as Supabase Edge Functions using the Supabase service role client instead of Base44's `asServiceRole`.

#### Step 6 — Add login page
Base44 handles login via redirect. Supabase needs a custom `/login` route with email/password auth.
- `dataClient.auth.redirectToLogin()` redirects to `/login`
- Use `supabase.auth.signInWithPassword({ email, password })` from `@supabase/supabase-js`
- On success, redirect to `/`
- Add route to `src/pages.config.js` and create `src/pages/Login.jsx`
- A test user has been created in the Supabase dashboard

#### Step 7 — Env var switch & cutover
```env
# .env (Base44 — current)
VITE_BACKEND=base44
VITE_BASE44_APP_ID=...
VITE_BASE44_APP_BASE_URL=...

# .env (Supabase — migration)
VITE_BACKEND=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Migration Status
| Step | Status |
|---|---|
| 1. Abstraction layer (`dataClient.js`) | **DONE** |
| 2. Migrate pages to dataClient | **DONE** |
| 3. Supabase project setup | **DONE** |
| 4. `supabaseBackend.js` implementation | **DONE** (scaffolded in `src/lib/backends/supabaseBackend.js`) |
| 5. Migrate sync functions | **DONE** |
| 6. Login page | **DONE** |
| 7. Env switch & cutover | **DONE** (`.env` already set to `VITE_BACKEND=supabase`) |

---

## Current State & Known Issues

### What's working
- App runs locally with `npm run dev` using Supabase backend (`VITE_BACKEND=supabase` in `.env`)
- Login page at `/login` with Supabase email/password auth
- Auth flow: unauthenticated → `/login` → sign in → `/`
- `auth.me()` gracefully handles missing `users` table row (test user created via Supabase dashboard won't have one)

### Pending deployment actions (Supabase dashboard)
- Deploy `functions/syncGames.ts` as a Supabase Edge Function
- Deploy `functions/syncSpreads.ts` as a Supabase Edge Function
- Add `ODDS_API_KEY` to Supabase → Settings → Edge Function Secrets (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically)
- Trigger `syncGames` manually once to populate the `games` table, then schedule it
- Trigger `syncSpreads` once to add spread data

### Key fixes made this session
- Removed `@base44/vite-plugin` from `vite.config.js` (was causing startup error); added `@` alias manually
- `auth.me()` in `supabaseBackend.js` no longer throws if no `users` row exists — falls back to auth user only
- `/login` route added outside `AuthenticatedApp` in `App.jsx` to prevent redirect loop
- `Login.jsx` calls `checkAppState()` before navigating to `/` to refresh auth state

---

## External APIs

### ESPN (no key required)
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard
```
Returns all games for the current day including live scores, tournament round, seeds, and region.

### The Odds API
- Sport key: `basketball_ncaab`
- Endpoint: `/v4/sports/basketball_ncaab/odds?markets=spreads`
- Free tier: 500 requests/month (sufficient for daily spread syncs through the tournament)
