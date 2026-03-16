import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as dataClient from '@/lib/dataClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp, Copy, Check, BarChart2, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { computeCoverMargin } from '@/lib/alpha';
import { buildLeaderboard } from '@/lib/leaderboard';
import TeamAnalytics from '@/components/community/TeamAnalytics';

function CoverBadge({ game, pickedTeam }) {
  if (game.status === 'scheduled') {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />Pending</span>;
  }
  const margin = computeCoverMargin(game, pickedTeam);
  if (margin === null) {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />No line</span>;
  }
  const covering = margin > 0;
  const push = margin === 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${covering ? 'text-primary' : push ? 'text-accent' : 'text-destructive'}`}>
      {covering ? <TrendingUp className="w-3 h-3" /> : push ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {covering ? 'Covering' : push ? 'Push' : 'Losing'}
      {!push && ` (${margin > 0 ? '+' : ''}${margin.toFixed(1)})`}
    </span>
  );
}

function LeaderboardCard({ entry, rank, picks }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-0">
        <button
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
            ${rank === 0 ? 'bg-accent text-accent-foreground' : rank === 1 ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {rank + 1}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold truncate">{entry.name}</p>
            <p className="text-xs text-muted-foreground">{entry.total} tournament pick{entry.total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{entry.covering}/{entry.active}</p>
              <p className="text-xs text-muted-foreground">covering</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${entry.totalAlpha >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {entry.totalAlpha >= 0 ? '+' : ''}{entry.totalAlpha.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">alpha</p>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="border-t border-border divide-y divide-border">
            {picks.map(tg => {
              const g = tg.game;
              const pickedTeamName = tg.picked_team === 'home' ? g.home_team : g.away_team;
              const opponent = tg.picked_team === 'home' ? g.away_team : g.home_team;
              const spread = g.spread || 0;
              const spreadDisplay = g.spread == null || g.spread_team == null ? 'No line'
                : g.spread_team === tg.picked_team
                  ? (spread > 0 ? `+${spread}` : `${spread}`)
                  : (spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`);
              return (
                <div key={tg.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {g.status === 'live' && <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs px-1.5 py-0">LIVE</Badge>}
                      {g.status === 'final' && <Badge variant="secondary" className="text-xs px-1.5 py-0">FINAL</Badge>}
                      {g.status === 'scheduled' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(g.game_time), 'MMM d, h:mm a')}
                        </span>
                      )}
                      {g.tournament_round && (
                        <span className="text-xs font-medium text-primary">{g.tournament_round}</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-primary">
                      {pickedTeamName} <span className="text-muted-foreground font-normal text-xs">({spreadDisplay})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">vs {opponent}</p>
                  </div>
                  <CoverBadge game={g} pickedTeam={tg.picked_team} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PoolDetail() {
  const { poolId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dataClient.auth.me().then(setCurrentUser).catch(() => {
      dataClient.auth.redirectToLogin();
    });
  }, []);

  const { data: pools = [], isLoading: poolLoading } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => dataClient.Pool.filter({ id: poolId }),
  });
  const pool = pools[0];

  const { data: memberRows = [], isLoading: membersLoading } = useQuery({
    queryKey: ['poolMembers', poolId],
    queryFn: () => dataClient.PoolMember.filter({ pool_id: poolId }),
  });

  const { data: allTracked = [], isLoading: trackedLoading } = useQuery({
    queryKey: ['allTrackedGames'],
    queryFn: () => dataClient.TrackedGame.list('-created_date'),
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => dataClient.Game.list('-game_time'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => dataClient.User.list(),
  });

  const isLoading = poolLoading || membersLoading || trackedLoading || gamesLoading;

  const memberEmails = useMemo(() => new Set(memberRows.map(m => m.user_email)), [memberRows]);
  const isMember = !!(currentUser && memberEmails.has(currentUser.email));

  const gamesById = useMemo(() => {
    const map = {};
    games.forEach(g => { map[g.id] = g; });
    return map;
  }, [games]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach(u => { map[u.email] = u; });
    return map;
  }, [users]);

  const memberPicks = useMemo(
    () => allTracked.filter(tg => memberEmails.has(tg.user_email || tg.created_by)),
    [allTracked, memberEmails]
  );

  const leaderboard = useMemo(() =>
    buildLeaderboard({
      allTracked: memberPicks,
      gamesById,
      usersById,
      filterGames: g => g.tournament_round != null,
    }),
    [memberPicks, gamesById, usersById]
  );

  // Picks with game detail per user (tournament only, for the dropdown)
  const picksByEmail = useMemo(() => {
    const map = {};
    memberPicks.forEach(tg => {
      const email = tg.user_email || tg.created_by;
      const g = gamesById[tg.game_id];
      if (!g || !g.tournament_round) return;
      if (!map[email]) map[email] = [];
      map[email].push({ ...tg, game: g });
    });
    Object.keys(map).forEach(email => {
      map[email].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    });
    return map;
  }, [memberPicks, gamesById]);

  // Tournament picks for analytics
  const tournamentPicks = useMemo(
    () => memberPicks.filter(tg => gamesById[tg.game_id]?.tournament_round),
    [memberPicks, gamesById]
  );

  const inviteUrl = pool ? `${window.location.origin}/Pools/join?code=${pool.invite_code}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Pool not found.</p>
        <Link to="/Pools">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Pools</Button>
        </Link>
      </div>
    );
  }

  if (currentUser && !isMember) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-4">
        <Trophy className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">You're not a member of this pool</p>
        <p className="text-muted-foreground text-sm text-center">Ask the pool creator for an invite link to join.</p>
        <Link to="/Pools">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />My Pools</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/Pools">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{pool.name}</h1>
            <p className="text-xs text-muted-foreground">
              {memberRows.length} member{memberRows.length !== 1 ? 's' : ''} · March Madness {pool.season}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-card border border-border h-8">
            <TabsTrigger value="leaderboard" className="gap-1.5 text-xs px-3 py-1">
              <Trophy className="w-3 h-3" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs px-3 py-1">
              <BarChart2 className="w-3 h-3" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1.5 text-xs px-3 py-1">
              <Share2 className="w-3 h-3" />
              Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            {leaderboard.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No tournament picks yet from pool members.
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <LeaderboardCard
                    key={entry.email}
                    entry={entry}
                    rank={i}
                    picks={picksByEmail[entry.email] || []}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <TeamAnalytics allTracked={tournamentPicks} games={games} />
          </TabsContent>

          <TabsContent value="invite">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-semibold mb-1 text-muted-foreground">Pool Invite Code</p>
                  <p className="text-3xl font-black tracking-widest text-primary">{pool.invite_code}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-muted-foreground">Shareable Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all">{inviteUrl}</code>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="flex-shrink-0 gap-1.5">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with friends — they'll be added to your pool automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
