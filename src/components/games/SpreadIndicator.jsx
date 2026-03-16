import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeCoverMargin, hasSpreadData } from '@/lib/alpha';

export default function SpreadIndicator({ game, pickedTeam }) {
  const coverMargin = computeCoverMargin(game, pickedTeam);
  const isCovering = coverMargin > 0;
  const isPush = coverMargin === 0;

  if (game.status === 'scheduled') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">Waiting for tip-off</span>
      </div>
    );
  }

  if (!hasSpreadData(game)) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">No spread data</span>
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
          {isPush ? 'PUSH' : `${coverMargin > 0 ? '+' : ''}${coverMargin?.toFixed(1)} pts vs. spread`}{game.status === 'final' ? ' (Final)' : ''}
        </span>
      </div>
    </div>
  );
}