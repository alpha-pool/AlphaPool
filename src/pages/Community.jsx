import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

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

export default function Community() {
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
      return {
        email,
        name: user?.full_name || email,
        total: picks.length,
        active: active.length,
        covering,
      };
    }).sort((a, b) => {
      if (b.active !== a.active) return b.active - a.active;
      return b.covering - a.covering;
    });
  }, [byUser, gamesById, usersById]);

  // Feed: grouped by user
  const feedByUser = useMemo(() => {
    return Object.entries(byUser).map(([email, picks]) => {
      const user = usersById[email];
      const picksWithGame = picks
        .map(tg => ({ ...tg, game: gamesById[tg.game_id] }))
        .filter(tg => tg.game)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return { email, name: user?.full_name || email, picks: picksWithGame };
    }).filter(u => u.picks.length > 0);
  }, [byUser, gamesById, usersById]);

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
            <h1 className="font-bold text-lg">Community</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="leaderboard" className="gap-2">
                <Trophy className="w-4 h-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-2">
                <Users className="w-4 h-4" />
                Group Feed
              </TabsTrigger>
            </TabsList>

            {/* LEADERBOARD */}
            <TabsContent value="leaderboard" className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">No picks yet across the group.</div>
              ) : leaderboard.map((entry, i) => (
                <Card key={entry.email}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${i === 0 ? 'bg-accent text-accent-foreground' : i === 1 ? 'bg-secondary text-secondary-foreground' : i === 2 ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.total} pick{entry.total !== 1 ? 's' : ''} total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{entry.covering}/{entry.active}</p>
                      <p className="text-xs text-muted-foreground">covering</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* GROUP FEED */}
            <TabsContent value="feed" className="space-y-3">
              {feedByUser.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">No picks yet.</div>
              ) : feedByUser.map(({ email, name, picks }) => (
                <UserPicksCard key={email} name={name} picks={picks} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}