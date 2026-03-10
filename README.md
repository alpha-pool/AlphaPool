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
| `syncGames` | ESPN API | Upserts today's NCAAB games into the `games` table |
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

### Recommended cron schedule

| Function | Schedule |
|---|---|
| `syncGames` | Every 1-5 minutes during game windows |
| `syncSpreads` | Once weekly (Tuesday morning) |

## Supabase Table Permissions

The following tables need a public `SELECT` policy for the frontend to read data:

- `games`
- `tracked_games`
- `users`
- `group_messages`

Go to **Supabase → Authentication → Policies → [table] → New Policy** and add a `SELECT` policy with `true` as the expression.
