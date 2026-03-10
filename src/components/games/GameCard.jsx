import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GameCard({ game, onTrack, isTracked, trackedTeam }) {
  const spread = game.spread || 0;
  const spreadDisplay = spread > 0 ? `+${spread}` : spread;

  const getStatusBadge = () => {
    if (game.status === 'live') {
      return (
        <Badge className="bg-destructive text-destructive-foreground animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full mr-2" />
          LIVE {game.quarter} {game.time_remaining}
        </Badge>
      );
    }
    if (game.status === 'final') {
      return <Badge variant="secondary">FINAL</Badge>;
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="w-3 h-3 mr-1" />
        {format(new Date(game.game_time), 'MMM d, h:mm a')}
      </Badge>
    );
  };

  const TeamRow = ({ isHome }) => {
    const teamName = isHome ? game.home_team : game.away_team;
    const logo = isHome ? game.home_logo : game.away_logo;
    const score = isHome ? game.home_score : game.away_score;
    const seed = isHome ? game.home_seed : game.away_seed;
    const side = isHome ? 'home' : 'away';
    const showSpread = game.spread_team === side;
    const isPickedTeam = isTracked && trackedTeam === side;

    return (
      <div className={cn(
        'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
        isPickedTeam && 'bg-primary/10 border border-primary/30'
      )}>
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={teamName} className="w-7 h-7 object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-bold">{teamName?.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className={cn('font-semibold text-sm', isPickedTeam && 'text-primary')}>
              {seed != null && (
                <span className="text-muted-foreground font-normal mr-1">({seed})</span>
              )}
              {teamName}
              {isPickedTeam && <Check className="w-3 h-3 inline ml-1" />}
            </p>
            {showSpread && (
              <span className="text-xs text-muted-foreground">{spreadDisplay}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {game.status !== 'scheduled' && (
            <span className="text-lg font-bold tabular-nums">{score}</span>
          )}
          {!isTracked && game.status !== 'final' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
              onClick={() => onTrack(game, side)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-2 px-3 border-b border-border flex items-center justify-between">
        {getStatusBadge()}
        <div className="flex items-center gap-2">
          {game.tournament_round ? (
            <span className="text-xs font-medium text-primary">{game.tournament_round}</span>
          ) : game.conference ? (
            <span className="text-xs text-muted-foreground">{game.conference}</span>
          ) : null}
          {game.region && (
            <span className="text-xs text-muted-foreground">· {game.region}</span>
          )}
          <Link to={createPageUrl(`GameDetail?id=${game.id}`)}>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-2 space-y-1">
        <TeamRow isHome={false} />
        <TeamRow isHome={true} />
      </div>
    </Card>
  );
}
