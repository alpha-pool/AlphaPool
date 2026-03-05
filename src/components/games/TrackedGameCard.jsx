import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import SpreadIndicator from './SpreadIndicator';
import { format } from 'date-fns';

export default function TrackedGameCard({ game, trackedGame, onRemove }) {
  const pickedTeam = trackedGame.picked_team;
  const pickedTeamName = pickedTeam === 'home' ? game.home_team : game.away_team;
  const opponentName = pickedTeam === 'home' ? game.away_team : game.home_team;
  const spread = game.spread || 0;
  
  let spreadDisplay;
  if (game.spread_team === pickedTeam) {
    spreadDisplay = spread > 0 ? `+${spread}` : spread;
  } else {
    spreadDisplay = spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`;
  }
  
  const getStatusBadge = () => {
    if (game.status === 'live') {
      return (
        <Badge className="bg-destructive text-destructive-foreground animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full mr-2" />
          LIVE
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
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      game.status === 'live' && "ring-2 ring-primary shadow-lg shadow-primary/20"
    )}>
      <div className="p-2 px-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {game.status === 'live' && (
            <span className="text-sm text-muted-foreground">
              {game.quarter} • {game.time_remaining}
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(trackedGame.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your Pick</p>
            <p className="text-base font-bold text-primary">{pickedTeamName} ({spreadDisplay})</p>
            <p className="text-xs text-muted-foreground">vs {opponentName}</p>
          </div>
          {game.status !== 'scheduled' && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-xl font-bold tabular-nums">
                {pickedTeam === 'home' ? game.home_score : game.away_score} - {pickedTeam === 'home' ? game.away_score : game.home_score}
              </p>
            </div>
          )}
        </div>
        
        <SpreadIndicator game={game} pickedTeam={pickedTeam} />
      </div>
    </Card>
  );
}