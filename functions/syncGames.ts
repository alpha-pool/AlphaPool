import { createClient } from 'npm:@supabase/supabase-js@2';

const ESPN_NCAAB_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

type ESPNStatus = 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_FINAL' | string;

function mapStatus(espnStatus: ESPNStatus): 'scheduled' | 'live' | 'final' {
  if (espnStatus === 'STATUS_IN_PROGRESS') return 'live';
  if (espnStatus === 'STATUS_FINAL') return 'final';
  return 'scheduled';
}

function getTournamentRound(notes: { headline?: string }[]): string | null {
  if (!notes?.length) return null;
  const note = notes.find(n => n.headline?.toLowerCase().includes('ncaa'));
  if (!note?.headline) return null;
  const match = note.headline.match(/- (.+)$/);
  return match ? match[1].trim() : null;
}

function mapCompetitor(competitor: any) {
  return {
    team: competitor.team?.displayName ?? '',
    logo: competitor.team?.logo ?? null,
    score: competitor.score != null ? parseInt(competitor.score, 10) : null,
    seed: competitor.curatedRank?.current ?? null,
  };
}

function mapGame(event: any): Record<string, unknown> {
  const competition = event.competitions?.[0];
  if (!competition) throw new Error(`No competition data for event ${event.id}`);

  const competitors: any[] = competition.competitors ?? [];
  const home = competitors.find((c: any) => c.homeAway === 'home');
  const away = competitors.find((c: any) => c.homeAway === 'away');

  if (!home || !away) throw new Error(`Missing competitor data for event ${event.id}`);

  const homeData = mapCompetitor(home);
  const awayData = mapCompetitor(away);

  const statusName: ESPNStatus = event.status?.type?.name ?? 'STATUS_SCHEDULED';
  const status = mapStatus(statusName);

  const tournamentRound = getTournamentRound(competition.notes ?? []);

  return {
    external_id: event.id,
    sport: 'basketball',
    home_team: homeData.team,
    home_logo: homeData.logo,
    home_score: status !== 'scheduled' ? homeData.score : null,
    home_seed: homeData.seed,
    away_team: awayData.team,
    away_logo: awayData.logo,
    away_score: status !== 'scheduled' ? awayData.score : null,
    away_seed: awayData.seed,
    status,
    quarter: status === 'live' ? `${event.status?.period ?? ''}H` : null,
    time_remaining: status === 'live' ? (event.status?.displayClock ?? null) : null,
    game_time: event.date ?? null,
    conference: competition.groups?.name ?? null,
    neutral_site: competition.neutralSite ?? false,
    tournament_round: tournamentRound,
    region: competition.groups?.shortName ?? null,
  };
}

async function fetchESPNGames(): Promise<any[]> {
  // groups=50 returns all D1 games; groups=100 returns NCAA tournament games
  // Fetch both and deduplicate by event id
  const fetchGroup = async (groups: string) => {
    const params = new URLSearchParams({ limit: '300', groups });
    const res = await fetch(`${ESPN_NCAAB_URL}?${params}`);
    if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
    const data = await res.json();
    return data.events ?? [];
  };

  const [d1Games, tournamentGames] = await Promise.all([
    fetchGroup('50'),
    fetchGroup('100'),
  ]);

  const seen = new Set<string>();
  const all = [];
  for (const event of [...d1Games, ...tournamentGames]) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      all.push(event);
    }
  }
  return all;
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const events = await fetchESPNGames();
    const results = { created: 0, updated: 0, errors: 0 };

    for (const event of events) {
      try {
        const gameData = mapGame(event);

        const { data: existing } = await supabase
          .from('games')
          .select('id')
          .eq('external_id', gameData.external_id)
          .single();

        if (existing) {
          await supabase.from('games').update(gameData).eq('id', existing.id);
          results.updated++;
        } else {
          await supabase.from('games').insert(gameData);
          results.created++;
        }
      } catch (err) {
        console.error(`Error processing event ${event.id}:`, err);
        results.errors++;
      }
    }

    return Response.json({
      message: 'Sync complete',
      ...results,
      total: events.length,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
