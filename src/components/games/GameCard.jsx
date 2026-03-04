import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  
  const TeamRow = ({ team, logo, score, isHome, spreadTeam }) => {
    const showSpread = spreadTeam === (isHome ? 'home' : 'away');
    const teamName = isHome ? game.home_team : game.away_team;
    const isPickedTeam = isTracked && trackedTeam === (isHome ? 'home' : 'away');
    
    return (
      <div className={cn(
        "flex items-center justify-between py-3 px-4 rounded-lg transition-colors",
        isPickedTeam && "bg-primary/10 border border-primary/30"
      )}>
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={teamName} className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold">{teamName?.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className={cn(
              "font-semibold",
              isPickedTeam && "text-primary"
            )}>
              {teamName}
              {isPickedTeam && <Check className="w-4 h-4 inline ml-2" />}
            </p>
            {showSpread && (
              <span className="text-sm text-muted-foreground">
                {spreadDisplay}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {game.status !== 'scheduled' && (
            <span className="text-2xl font-bold tabular-nums">{score}</span>
          )}
          {!isTracked && game.status !== 'final' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:bg-primary/10"
              onClick={() => onTrack(game, isHome ? 'home' : 'away')}
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
      <div className="p-4 border-b border-border flex items-center justify-between">
        {getStatusBadge()}
        {game.conference && (
          <span className="text-xs text-muted-foreground">{game.conference}</span>
        )}
      </div>
      <div className="p-2 space-y-1">
        <TeamRow
          team={game.away_team}
          logo={game.away_logo}
          score={game.away_score}
          isHome={false}
          spreadTeam={game.spread_team}
        />
        <TeamRow
          team={game.home_team}
          logo={game.home_logo}
          score={game.home_score}
          isHome={true}
          spreadTeam={game.spread_team}
        />
      </div>
    </Card>
  );
}