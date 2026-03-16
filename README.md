# AlphaSpread

A college sports spread tracking and community analytics platform. Users pick teams against the spread, earn alpha points based on cover margin, and compete on a group leaderboard.

## Tech Stack

- **Frontend:** React 18 + Vite, React Router 6, TanStack Query 5, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend:** Supabase (auth + database + edge functions)
- **Game data:** ESPN API (scores, live updates)
- **Spread data:** The Odds API

## Local Development

**Prerequisites:** Node.js 18+, [Supabase CLI](https://supabase.com/docs/guides/cli)

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```env
   VITE_BACKEND=supabase
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:5173` — you'll be redirected to `/login`. Sign in with your Supabase auth credentials.

## Edge Functions

Game data and spreads are synced via two Supabase Edge Functions in `supabase/functions/`:

| Function | Source | Purpose |
|---|---|---|
| `syncGames` | ESPN API | Upserts today's NCAAB games; auto-deletes stale final regular-season games |
| `syncSpreads` | The Odds API | Updates `spread` and `spread_team` on non-final games |

### Deploying functions

```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy syncGames --no-verify-jwt
supabase functions deploy syncSpreads --no-verify-jwt
```

### Setting secrets

```bash
supabase secrets set ODDS_API_KEY=your_key_here
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### Invoking manually

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/syncGames
curl -X POST https://<project-ref>.supabase.co/functions/v1/syncSpreads
```

### Cron schedule (pg_cron)

Cron jobs are configured via pg_cron in the Supabase SQL editor. Both `pg_cron` and `pg_net` extensions must be enabled (**Database → Extensions**).

| Job name | Schedule | Purpose |
|---|---|---|
| `sync-games-daily` | `0 10 * * *` (10am UTC / 6am ET) | Seeds next day's tournament games |
| `sync-games-live` | `*/5 17-23,0-4 * * *` | Live score updates during game windows |
| `syncSpreads` | Once weekly (Tuesday morning) | Refresh pre-game spreads |

To view or manage jobs:
```sql
-- List all jobs
select jobname, schedule, active from cron.job;

-- View recent run history
select jobname, status, return_message, start_time
from cron.job_run_details
order by start_time desc limit 20;

-- Pause / resume
select cron.alter_job('sync-games-live', active := false);
select cron.alter_job('sync-games-live', active := true);
```

## Supabase Table Permissions

The following tables need a public `SELECT` policy for the frontend to read data:

- `games`
- `tracked_games`
- `users`
- `group_messages`
- `pools`
- `pool_members`

Go to **Supabase → Authentication → Policies → [table] → New Policy** and add a `SELECT` policy with `true` as the expression.

`pools` and `pool_members` also need an authenticated `INSERT` policy (`auth.role() = 'authenticated'`).

### Foreign key constraint

`tracked_games.game_id` must have `ON DELETE CASCADE` so that deleting a game automatically removes associated picks:

```sql
ALTER TABLE tracked_games
  DROP CONSTRAINT IF EXISTS tracked_games_game_id_fkey,
  ADD CONSTRAINT tracked_games_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
```
