import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as dataClient from '@/lib/dataClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const ADMIN_EMAILS = ['cameroncmoeller@gmail.com'];

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmGame, setConfirmGame] = useState(null); // game to delete
  const queryClient = useQueryClient();

  useEffect(() => {
    dataClient.auth.me().then(u => {
      setCurrentUser(u);
      setAuthLoading(false);
    }).catch(() => {
      dataClient.auth.redirectToLogin();
    });
  }, []);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => dataClient.Game.list('-game_time'),
    enabled: !!currentUser,
  });

  const { data: allTracked = [], isLoading: trackedLoading } = useQuery({
    queryKey: ['allTrackedGames'],
    queryFn: () => dataClient.TrackedGame.list(),
    enabled: !!currentUser,
  });

  const deleteMutation = useMutation({
    mutationFn: (gameId) => dataClient.Game.delete(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['allTrackedGames'] });
      queryClient.invalidateQueries({ queryKey: ['trackedGames'] });
      setConfirmGame(null);
    },
  });

  const pickCountByGame = useMemo(() => {
    const map = {};
    allTracked.forEach(tg => {
      map[tg.game_id] = (map[tg.game_id] || 0) + 1;
    });
    return map;
  }, [allTracked]);

  const deletableGames = useMemo(() =>
    games.filter(g => g.status === 'scheduled'),
    [games]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes(currentUser?.email)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Not authorized</p>
        <Link to={createPageUrl('Home')}>
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  const isLoading = gamesLoading || trackedLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Admin — Game Management</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Only <strong>scheduled</strong> games can be deleted. Deleting a game removes all associated picks.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : deletableGames.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No scheduled games to manage.
          </div>
        ) : (
          <div className="space-y-2">
            {deletableGames.map(game => {
              const pickCount = pickCountByGame[game.id] || 0;
              return (
                <Card key={game.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {game.away_team} <span className="text-muted-foreground font-normal">vs</span> {game.home_team}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {game.tournament_round && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{game.tournament_round}</Badge>
                        )}
                        {game.game_time && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(game.game_time), 'MMM d, h:mm a')}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {pickCount} pick{pickCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => setConfirmGame(game)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!confirmGame} onOpenChange={open => { if (!open) setConfirmGame(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Game?</DialogTitle>
          </DialogHeader>
          {confirmGame && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete{' '}
                <strong>{confirmGame.away_team} vs {confirmGame.home_team}</strong>
                {pickCountByGame[confirmGame.id]
                  ? ` and remove ${pickCountByGame[confirmGame.id]} pick${pickCountByGame[confirmGame.id] !== 1 ? 's' : ''}`
                  : ''}.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmGame(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(confirmGame.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
