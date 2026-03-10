import { createClient } from 'npm:@supabase/supabase-js@2';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const SPORT_KEY = 'basketball_ncaab';

interface OddsGame {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        point: number;
      }[];
    }[];
  }[];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function extractSpread(game: OddsGame): { spread: number; spread_team: 'home' | 'away' } | null {
  const preferred = ['draftkings', 'fanduel', 'betmgm'];
  const bookmakers = [
    ...preferred.map(k => game.bookmakers.find(b => b.key === k)).filter(Boolean),
    ...game.bookmakers.filter(b => !preferred.includes(b.key)),
  ] as OddsGame['bookmakers'];

  for (const bookmaker of bookmakers) {
    const spreadsMarket = bookmaker.markets.find(m => m.key === 'spreads');
    if (!spreadsMarket) continue;

    const homeOutcome = spreadsMarket.outcomes.find(o => teamsMatch(o.name, game.home_team));
    const awayOutcome = spreadsMarket.outcomes.find(o => teamsMatch(o.name, game.away_team));

    if (!homeOutcome || !awayOutcome) continue;

    if (homeOutcome.point < 0) {
      return { spread: Math.abs(homeOutcome.point), spread_team: 'home' };
    } else {
      return { spread: Math.abs(awayOutcome.point), spread_team: 'away' };
    }
  }

  return null;
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('ODDS_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }
    if (!apiKey) {
      return Response.json({ error: 'ODDS_API_KEY environment variable not set' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch odds
    const oddsUrl = `${ODDS_API_BASE}/sports/${SPORT_KEY}/odds?apiKey=${apiKey}&regions=us&markets=spreads&oddsFormat=american`;
    const oddsRes = await fetch(oddsUrl);
    if (!oddsRes.ok) {
      throw new Error(`Odds API error: ${oddsRes.status} ${await oddsRes.text()}`);
    }
    const oddsGames: OddsGame[] = await oddsRes.json();

    // Fetch non-final games from Supabase
    const { data: scheduledGames } = await supabase.from('games').select('*').eq('status', 'scheduled');
    const { data: liveGames } = await supabase.from('games').select('*').eq('status', 'live');
    const gamesToUpdate = [...(scheduledGames ?? []), ...(liveGames ?? [])];

    const results = { updated: 0, unmatched: 0 };

    for (const oddsGame of oddsGames) {
      const spread = extractSpread(oddsGame);
      if (!spread) continue;

      const match = gamesToUpdate.find(g =>
        teamsMatch(g.home_team, oddsGame.home_team) &&
        teamsMatch(g.away_team, oddsGame.away_team)
      );

      if (match) {
        await supabase.from('games').update(spread).eq('id', match.id);
        results.updated++;
      } else {
        results.unmatched++;
      }
    }

    return Response.json({
      message: 'Spread sync complete',
      odds_games_fetched: oddsGames.length,
      ...results,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
