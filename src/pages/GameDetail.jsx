import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Trophy, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SpreadIndicator from '@/components/games/SpreadIndicator';

export default function GameDetail() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('id');

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list(),
    refetchInterval: (data) => data?.some(g => g.status === 'live') ? 15000 : false,
  });

  const { data: trackedGames = [] } = useQuery({
    queryKey: ['trackedGames'],
    queryFn: () => base44.entities.TrackedGame.list(),
  });

  const game = games.find(g => g.id === gameId);
  const trackedGame = trackedGames.find(tg => tg.game_id === gameId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-lg">Game not found.</p>
        <Link to={createPageUrl('Home')}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Games</Button>
        </Link>
      </div>
    );
  }

  const spread = game.spread || 0;
  const homeSpreadDisplay = game.spread_team === 'home'
    ? (spread > 0 ? `+${spread}` : `${spread}`)
    : (spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`);
  const awaySpreadDisplay = game.spread_team === 'away'
    ? (spread > 0 ? `+${spread}` : `${spread}`)
    : (spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`);

  const getStatusBadge = () => {
    if (game.status === 'live') {
      return (
        <Badge className="bg-destructive text-destructive-foreground animate-pulse text-sm px-3 py-1">
          <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block" />
          LIVE — {game.quarter} · {game.time_remaining}
        </Badge>
      );
    }
    if (game.status === 'final') return <Badge variant="secondary" className="text-sm px-3 py-1">FINAL</Badge>;
    return (
      <Badge variant="outline" className="text-muted-foreground text-sm px-3 py-1">
        <Clock className="w-3 h-3 mr-1" />
        {format(new Date(game.game_time), 'EEEE, MMMM d · h:mm a')}
      </Badge>
    );
  };

  const TeamDisplay = ({ teamName, logo, score, spreadDisplay, isHome }) => (
    <div className="flex flex-col items-center gap-3 flex-1">
      {logo ? (
        <img src={logo} alt={teamName} className="w-24 h-24 object-contain" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-4xl font-bold text-muted-foreground">{teamName?.charAt(0)}</span>
        </div>
      )}
      <div className="text-center">
        <p className="text-lg font-bold">{teamName}</p>
        <p className="text-sm text-muted-foreground">{isHome ? 'Home' : 'Away'}</p>
      </div>
      <div className="text-center">
        {game.status !== 'scheduled' && (
          <p className="text-5xl font-black tabular-nums">{score ?? 0}</p>
        )}
        <p className="text-base text-muted-foreground font-semibold mt-1">
          Spread: <span className="text-foreground">{spreadDisplay}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Game Details</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Status & Conference */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {getStatusBadge()}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {game.conference && (
              <>
                <MapPin className="w-4 h-4" />
                <span>{game.conference}</span>
              </>
            )}
            {game.week && <span>· Week {game.week}</span>}
          </div>
        </div>

        {/* Scoreboard */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-10">
            <div className="flex items-center justify-between gap-4">
              <TeamDisplay
                teamName={game.away_team}
                logo={game.away_logo}
                score={game.away_score}
                spreadDisplay={awaySpreadDisplay}
                isHome={false}
              />

              <div className="flex flex-col items-center gap-2 px-4">
                {game.status === 'scheduled' ? (
                  <>
                    <span className="text-3xl font-black text-muted-foreground">VS</span>
                    <span className="text-sm text-muted-foreground text-center">
                      {format(new Date(game.game_time), 'h:mm a')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-black text-muted-foreground">—</span>
                    {game.status === 'live' && (
                      <div className="text-center">
                        <p className="text-sm font-bold text-destructive">{game.quarter}</p>
                        <p className="text-xs text-muted-foreground">{game.time_remaining}</p>
                      </div>
                    )}
                    {game.status === 'final' && (
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Final</span>
                    )}
                  </>
                )}
              </div>

              <TeamDisplay
                teamName={game.home_team}
                logo={game.home_logo}
                score={game.home_score}
                spreadDisplay={homeSpreadDisplay}
                isHome={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Spread Coverage */}
        {trackedGame && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="font-semibold text-lg">Your Pick Coverage</h2>
              <p className="text-sm text-muted-foreground">
                You picked <span className="font-semibold text-foreground">
                  {trackedGame.picked_team === 'home' ? game.home_team : game.away_team}
                </span> to cover the spread
              </p>
              <SpreadIndicator game={game} pickedTeam={trackedGame.picked_team} />
            </CardContent>
          </Card>
        )}

        {/* Spread Details */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Spread Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Favored Team</p>
                <p className="font-bold text-base">
                  {game.spread_team === 'home' ? game.home_team : game.away_team}
                </p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Line</p>
                <p className="font-bold text-base">
                  {spread > 0 ? `-${spread}` : spread}
                </p>
              </div>
              {game.status !== 'scheduled' && (
                <>
                  <div className="bg-muted rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Current Margin</p>
                    <p className="font-bold text-base">
                      {Math.abs((game.home_score || 0) - (game.away_score || 0))} pts
                      {' '}({(game.home_score || 0) > (game.away_score || 0) ? game.home_team : game.away_team} leading)
                    </p>
                  </div>
                  <div className="bg-muted rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Covering?</p>
                    <p className="font-bold text-base">
                      {(() => {
                        const diff = (game.home_score || 0) - (game.away_score || 0);
                        if (game.spread_team === 'home') {
                          return diff + spread > 0 ? `✅ ${game.home_team}` : `❌ ${game.away_team}`;
                        } else {
                          return -diff + spread > 0 ? `✅ ${game.away_team}` : `❌ ${game.home_team}`;
                        }
                      })()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Game Info */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="font-semibold text-lg">Game Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {game.conference && (
                <div>
                  <p className="text-muted-foreground">Conference</p>
                  <p className="font-medium">{game.conference}</p>
                </div>
              )}
              {game.week && (
                <div>
                  <p className="text-muted-foreground">Week</p>
                  <p className="font-medium">{game.week}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium">{format(new Date(game.game_time), 'MMM d, yyyy · h:mm a')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{game.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}