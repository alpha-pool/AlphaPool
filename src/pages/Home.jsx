import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, Calendar, TrendingUp, Trophy, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GameCard from '@/components/games/GameCard';
import TrackedGameCard from '@/components/games/TrackedGameCard';

export default function Home() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conferenceFilter, setConferenceFilter] = useState('all');

  const POWER4 = ['SEC', 'Big Ten', 'Big 12', 'ACC'];
  const queryClient = useQueryClient();
  
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-game_time'),
    refetchInterval: (query) => query.state.data?.some(g => g.status === 'live') ? 15000 : false,
  });
  
  const { data: trackedGames = [], isLoading: trackedLoading } = useQuery({
    queryKey: ['trackedGames'],
    queryFn: () => base44.entities.TrackedGame.list(),
  });
  
  const trackMutation = useMutation({
    mutationFn: (data) => base44.entities.TrackedGame.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trackedGames'] }),
  });
  
  const untrackMutation = useMutation({
    mutationFn: (id) => base44.entities.TrackedGame.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trackedGames'] }),
  });
  
  const handleTrack = (game, team) => {
    trackMutation.mutate({
      game_id: game.id,
      picked_team: team,
    });
  };
  
  const trackedGameIds = trackedGames.map(tg => tg.game_id);
  
  const conferences = useMemo(() => {
    const seen = new Set();
    games.forEach(g => { if (g.conference) seen.add(g.conference); });
    return Array.from(seen).sort();
  }, [games]);

  const filteredGames = games.filter(game => {
    const matchesSearch = 
      game.home_team?.toLowerCase().includes(search.toLowerCase()) ||
      game.away_team?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || game.status === statusFilter;
    const matchesConference = 
      conferenceFilter === 'all' ? true :
      conferenceFilter === 'power4' ? POWER4.includes(game.conference) :
      game.conference === conferenceFilter;
    return matchesSearch && matchesStatus && matchesConference;
  });
  
  const trackedGamesWithDetails = trackedGames.map(tg => ({
    ...tg,
    game: games.find(g => g.id === tg.game_id),
  })).filter(tg => tg.game);
  
  const liveTracked = trackedGamesWithDetails.filter(tg => tg.game.status === 'live');
  const upcomingTracked = trackedGamesWithDetails.filter(tg => tg.game.status === 'scheduled');
  const completedTracked = trackedGamesWithDetails.filter(tg => tg.game.status === 'final');
  
  // Stats
  const coveringCount = trackedGamesWithDetails.filter(tg => {
    const g = tg.game;
    if (g.status === 'scheduled') return false;
    const homeScore = g.home_score || 0;
    const awayScore = g.away_score || 0;
    const spread = g.spread || 0;
    let margin;
    if (tg.picked_team === 'home') {
      margin = g.spread_team === 'home' ? (homeScore - awayScore) + spread : (homeScore - awayScore) - spread;
    } else {
      margin = g.spread_team === 'away' ? (awayScore - homeScore) + spread : (awayScore - homeScore) - spread;
    }
    return margin > 0;
  }).length;
  
  const activeGames = trackedGamesWithDetails.filter(tg => tg.game.status !== 'scheduled').length;

  const totalAlpha = trackedGamesWithDetails.reduce((sum, tg) => {
    const g = tg.game;
    if (g.status === 'scheduled') return sum;
    const homeScore = g.home_score || 0;
    const awayScore = g.away_score || 0;
    const spread = g.spread || 0;
    let margin;
    if (tg.picked_team === 'home') {
      margin = g.spread_team === 'home' ? (homeScore - awayScore) + spread : (homeScore - awayScore) - spread;
    } else {
      margin = g.spread_team === 'away' ? (awayScore - homeScore) + spread : (awayScore - homeScore) - spread;
    }
    return sum + margin;
  }, 0);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AlphaSpread</h1>
                <p className="text-xs text-muted-foreground">College Football</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Community')}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Group</span>
                </Button>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{trackedGames.length}</p>
                  <p className="text-xs text-muted-foreground">Tracking</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">{liveTracked.length}</p>
                  <p className="text-xs text-muted-foreground">Live</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{coveringCount}/{activeGames}</p>
                  <p className="text-xs text-muted-foreground">Covering</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${totalAlpha >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {totalAlpha >= 0 ? '+' : ''}{totalAlpha.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Alpha Pts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="tracked" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="tracked" className="gap-2">
              <Activity className="w-4 h-4" />
              My Picks
              {trackedGames.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {trackedGames.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <Calendar className="w-4 h-4" />
              All Games
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tracked" className="space-y-6">
            {trackedGamesWithDetails.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Alpha</span>
                <span className={`text-2xl font-bold ml-auto ${totalAlpha >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {totalAlpha >= 0 ? '+' : ''}{totalAlpha.toFixed(1)}
                </span>
              </div>
            )}
            {trackedLoading || gamesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : trackedGamesWithDetails.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No games tracked yet</h3>
                <p className="text-muted-foreground mb-4">
                  Browse games and pick teams to track their spread coverage
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {liveTracked.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      Live Now
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {liveTracked.map(tg => (
                        <TrackedGameCard
                          key={tg.id}
                          game={tg.game}
                          trackedGame={tg}
                          onRemove={untrackMutation.mutate}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {upcomingTracked.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingTracked.map(tg => (
                        <TrackedGameCard
                          key={tg.id}
                          game={tg.game}
                          trackedGame={tg}
                          onRemove={untrackMutation.mutate}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {completedTracked.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Completed</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {completedTracked.map(tg => (
                        <TrackedGameCard
                          key={tg.id}
                          game={tg.game}
                          trackedGame={tg}
                          onRemove={untrackMutation.mutate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="scheduled">Upcoming</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
              <Select value={conferenceFilter} onValueChange={setConferenceFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Conference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conferences</SelectItem>
                  <SelectItem value="power4">Power 4</SelectItem>
                  {conferences.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {gamesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No games found</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onTrack={handleTrack}
                    isTracked={trackedGameIds.includes(game.id)}
                    trackedTeam={trackedGames.find(tg => tg.game_id === game.id)?.picked_team}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}