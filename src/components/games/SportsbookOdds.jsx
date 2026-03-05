import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generate deterministic mock odds seeded by gameId so they stay consistent per game
function getMockOdds(game) {
  const seed = game.id?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) || 42;
  const baseSpread = game.spread || 0;

  const books = [
    { name: 'DraftKings', short: 'DK' },
    { name: 'FanDuel', short: 'FD' },
    { name: 'BetMGM', short: 'MGM' },
    { name: 'Caesars', short: 'CZR' },
  ];

  return books.map((book, i) => {
    // Vary spread by ±0.5 or ±1 in a deterministic way
    const variation = ((seed + i * 17) % 5 - 2) * 0.5; // -1, -0.5, 0, +0.5, +1
    const spread = parseFloat((baseSpread + variation).toFixed(1));
    return { ...book, spread };
  });
}

export default function SportsbookOdds({ game }) {
  const [open, setOpen] = useState(false);
  const odds = getMockOdds(game);
  const baseSpread = game.spread || 0;
  const spreadTeam = game.spread_team;

  const formatSpread = (val) => (val > 0 ? `+${val}` : `${val}`);

  // Best line = most favorable spread for the favored team (lowest number)
  const bestLine = Math.min(...odds.map(o => o.spread));

  return (
    <div className="border-t border-border mt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium">Compare Sportsbook Lines</span>
        <div className="flex items-center gap-1">
          <span className="text-foreground font-semibold">Best: {formatSpread(bestLine)}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 grid grid-cols-4 gap-2">
          {odds.map(book => {
            const isBest = book.spread === bestLine;
            const diff = parseFloat((book.spread - baseSpread).toFixed(1));
            return (
              <div
                key={book.name}
                className={cn(
                  "rounded-lg p-2 text-center border",
                  isBest
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-foreground"
                )}
              >
                <p className="text-xs font-bold">{book.short}</p>
                <p className="text-sm font-semibold tabular-nums">{formatSpread(book.spread)}</p>
                {diff !== 0 && (
                  <p className={cn("text-xs", diff < 0 ? "text-green-500" : "text-destructive")}>
                    {diff > 0 ? `+${diff}` : `${diff}`}
                  </p>
                )}
              </div>
            );
          })}
          <p className="col-span-4 text-xs text-muted-foreground mt-1 text-center">
            Spread shown for {spreadTeam === 'home' ? game.home_team : game.away_team} · Simulated odds
          </p>
        </div>
      )}
    </div>
  );
}