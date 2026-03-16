import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as dataClient from '@/lib/dataClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Clock, Target, Pencil, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { computeCoverMargin } from '@/lib/alpha';

function StatCard({ label, value, sub, color = 'text-foreground' }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CoverBadge({ game, pickedTeam }) {
  if (game.status === 'scheduled') {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" />Pending</span>;
  }
  const margin = computeCoverMargin(game, pickedTeam);
  if (margin === null) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" />No line</span>;
  }
  const covering = margin > 0;
  const push = margin === 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${covering ? 'text-primary' : push ? 'text-accent' : 'text-destructive'}`}>
      {covering ? <TrendingUp className="w-3 h-3" /> : push ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {covering ? 'Covered' : push ? 'Push' : 'Lost'}
      {!push && ` (${margin > 0 ? '+' : ''}${margin.toFixed(1)})`}
    </span>
  );
}

export default function Profile() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileEmail = urlParams.get('email');
  const fromCommunity = urlParams.get('from') === 'community';

  const [currentUser, setCurrentUser] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [favTeam, setFavTeam] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    dataClient.auth.me().then(u => {
      setCurrentUser(u);
    }).catch(() => {
      dataClient.auth.redirectToLogin();
    });
  }, []);

  const targetEmail = profileEmail || currentUser?.email;
  const isOwnProfile = currentUser?.email && currentUser.email === targetEmail;

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => dataClient.User.list(),
  });

  const { data: allTracked = [], isLoading: trackedLoading } = useQuery({
    queryKey: ['allTrackedGames'],
    queryFn: () => dataClient.TrackedGame.list(),
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => dataClient.Game.list('-game_time'),
  });

  const profileUser = useMemo(() => users.find(u => u.email === targetEmail), [users, targetEmail]);

  useEffect(() => {
    if (profileUser) {
      setBioText(profileUser.bio || '');
      setFavTeam(profileUser.favorite_team || '');
    }
  }, [profileUser]);

  const updateMutation = useMutation({
    mutationFn: (data) => dataClient.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingBio(false);
    },
  });

  const gamesById = useMemo(() => {
    const map = {};
    games.forEach(g => { map[g.id] = g; });
    return map;
  }, [games]);

  const myPicks = useMemo(() => {
    return allTracked
      .filter(tg => tg.created_by === targetEmail)
      .map(tg => ({ ...tg, game: gamesById[tg.game_id] }))
      .filter(tg => tg.game)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [allTracked, targetEmail, gamesById]);

  const stats = useMemo(() => {
    const active = myPicks.filter(tg => tg.game.status !== 'scheduled');
    const covering = active.filter(tg => {
      const margin = computeCoverMargin(tg.game, tg.picked_team);
      return margin !== null && margin > 0;
    }).length;
    const totalAlpha = active.reduce((sum, tg) => {
      const margin = computeCoverMargin(tg.game, tg.picked_team);
      return sum + (margin ?? 0);
    }, 0);
    const winRate = active.length > 0 ? ((covering / active.length) * 100).toFixed(0) : '—';
    return { total: myPicks.length, active: active.length, covering, totalAlpha, winRate };
  }, [myPicks]);

  const isLoading = trackedLoading || gamesLoading;
  const displayName = profileUser?.full_name || targetEmail || 'Loading...';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!targetEmail && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl(fromCommunity ? 'Community' : 'Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Player Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar + Name */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{displayName}</h2>
                {profileUser?.favorite_team && !editingBio && (
                  <p className="text-sm text-muted-foreground mt-0.5">🏈 {profileUser.favorite_team}</p>
                )}

                {editingBio ? (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Favorite team"
                      value={favTeam}
                      onChange={e => setFavTeam(e.target.value)}
                      className="text-sm"
                    />
                    <Textarea
                      placeholder="Tell the group about your betting style..."
                      value={bioText}
                      onChange={e => setBioText(e.target.value)}
                      className="text-sm resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateMutation.mutate({ bio: bioText, favorite_team: favTeam })} disabled={updateMutation.isPending}>
                        <Check className="w-3 h-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBio(false)}>
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground italic">
                      {profileUser?.bio || (isOwnProfile ? 'No bio yet — add one!' : 'No bio.')}
                    </p>
                    {isOwnProfile && (
                      <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => setEditingBio(true)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit Profile
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Picks" value={stats.total} color="text-foreground" />
          <StatCard label="Cover Rate" value={stats.active > 0 ? `${stats.winRate}%` : '—'} sub={`${stats.covering}/${stats.active} active`} color="text-primary" />
          <StatCard label="Alpha Pts" value={stats.active > 0 ? `${stats.totalAlpha >= 0 ? '+' : ''}${stats.totalAlpha.toFixed(1)}` : '—'} color={stats.totalAlpha >= 0 ? 'text-primary' : 'text-destructive'} />
          <StatCard label="Active" value={stats.active} sub="graded picks" color="text-accent" />
        </div>

        {/* Pick History */}
        <div>
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Pick History
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : myPicks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No picks yet.</div>
          ) : (
            <div className="space-y-2">
              {myPicks.map(tg => {
                const g = tg.game;
                const pickedTeamName = tg.picked_team === 'home' ? g.home_team : g.away_team;
                const opponent = tg.picked_team === 'home' ? g.away_team : g.home_team;
                const spread = g.spread || 0;
                const spreadDisplay = g.spread_team === tg.picked_team
                  ? (spread > 0 ? `+${spread}` : `${spread}`)
                  : (spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`);
                return (
                  <Card key={tg.id}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {g.status === 'live' && (
                            <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs px-1.5 py-0">LIVE</Badge>
                          )}
                          {g.status === 'final' && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">FINAL</Badge>
                          )}
                          {g.status === 'scheduled' && g.game_time && (
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}