import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import GroupChat from '@/components/community/GroupChat';

function computeCoverMargin(game, pickedTeam) {
  const homeScore = game.home_score || 0;
  const awayScore = game.away_score || 0;
  const spread = game.spread || 0;
  if (pickedTeam === 'home') {
    return game.spread_team === 'home'
      ? (homeScore - awayScore) + spread
      : (homeScore - awayScore) - spread;
  } else {
    return game.spread_team === 'away'
      ? (awayScore - homeScore) + spread
      : (awayScore - homeScore) - spread;
  }
}

function CoverBadge({ game, pickedTeam }) {
  if (game.status === 'scheduled') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
        Pending
      </span>
    );
  }
  const margin = computeCoverMargin(game, pickedTeam);
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
            <p className="text-xs text-muted-foreground">{entry.total} pick{entry.total !== 1 ? 's' : ''} total</p>
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
              const spreadDisplay = g.spread_team === tg.picked_team
                ? (spread > 0 ? `+${spread}` : `${spread}`)
                : (spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`);
              return (
                <div key={tg.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {g.status === 'live' && (
                        <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs px-1.5 py-0">LIVE</Badge>
                      )}
                      {g.status === 'final' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">FINAL</Badge>
                      )}
                      {g.status === 'scheduled' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(g.game_time), 'MMM d, h:mm a')}
                        </span>
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

export default function Community() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allTracked = [], isLoading: trackedLoading } = useQuery({
    queryKey: ['allTrackedGames'],
    queryFn: () => base44.entities.TrackedGame.list(),
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-game_time'),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const isLoading = trackedLoading || gamesLoading || usersLoading;

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

  // Group tracked games by user email
  const byUser = useMemo(() => {
    const map = {};
    allTracked.forEach(tg => {
      const email = tg.created_by;
      if (!map[email]) map[email] = [];
      map[email].push(tg);
    });
    return map;
  }, [allTracked]);

  // Leaderboard: per user, count covering/total active (non-scheduled)
  const leaderboard = useMemo(() => {
    return Object.entries(byUser).map(([email, picks]) => {
      const user = usersById[email];
      const active = picks.filter(tg => {
        const g = gamesById[tg.game_id];
        return g && g.status !== 'scheduled';
      });
      const covering = active.filter(tg => {
        const g = gamesById[tg.game_id];
        return g && computeCoverMargin(g, tg.picked_team) > 0;
      }).length;
      const totalAlpha = active.reduce((sum, tg) => {
        const g = gamesById[tg.game_id];
        return g ? sum + computeCoverMargin(g, tg.picked_team) : sum;
      }, 0);
      return {
        email,
        name: user?.full_name || email,
        total: picks.length,
        active: active.length,
        covering,
        totalAlpha,
      };
    }).sort((a, b) => {
      if (b.active !== a.active) return b.active - a.active;
      return b.covering - a.covering;
    });
  }, [byUser, gamesById, usersById]);

  // Picks with game detail per user (for dropdown)
  const picksByEmail = useMemo(() => {
    const map = {};
    Object.entries(byUser).forEach(([email, picks]) => {
      map[email] = picks
        .map(tg => ({ ...tg, game: gamesById[tg.game_id] }))
        .filter(tg => tg.game)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    });
    return map;
  }, [byUser, gamesById]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">CFB Alpha Pool</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Group Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">No picks yet across the group.</div>
                ) : leaderboard.map((entry, i) => (
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

          <TabsContent value="chat">
            <GroupChat currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}