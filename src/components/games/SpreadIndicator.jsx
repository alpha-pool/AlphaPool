import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SpreadIndicator({ game, pickedTeam }) {
  // Calculate if the picked team is covering
  const homeScore = game.home_score || 0;
  const awayScore = game.away_score || 0;
  const spread = game.spread || 0;
  
  // Calculate adjusted score based on spread
  // If spread is -7 for home team, home needs to win by more than 7
  let coverMargin;
  
  if (pickedTeam === 'home') {
    if (game.spread_team === 'home') {
      // Home is favored, needs to win by more than spread
      coverMargin = (homeScore - awayScore) + spread;
    } else {
      // Home is underdog, needs to lose by less than spread or win
      coverMargin = (homeScore - awayScore) - spread;
    }
  } else {
    if (game.spread_team === 'away') {
      // Away is favored
      coverMargin = (awayScore - homeScore) + spread;
    } else {
      // Away is underdog
      coverMargin = (awayScore - homeScore) - spread;
    }
  }
  
  const isCovering = coverMargin > 0;
  const isPush = coverMargin === 0;
  const absMargin = Math.abs(coverMargin).toFixed(1);
  
  if (game.status === 'scheduled') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">Waiting for kickoff</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg",
      isCovering ? "bg-primary/20 text-primary" : isPush ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"
    )}>
      {isCovering ? (
        <TrendingUp className="w-5 h-5" />
      ) : isPush ? (
        <Minus className="w-5 h-5" />
      ) : (
        <TrendingDown className="w-5 h-5" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-bold">
          {isCovering ? 'COVERING' : isPush ? 'PUSH' : 'NOT COVERING'}
        </span>
        <span className="text-xs opacity-80">
          {isCovering ? '+' : '-'}{absMargin} pts {game.status === 'final' ? '(Final)' : ''}
        </span>
      </div>
    </div>
  );
}