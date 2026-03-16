import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import { computeCoverMargin } from '@/lib/alpha';

function BarRow({ label, value, max, sub, color = 'bg-primary' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm font-medium truncate flex-shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-14 text-right text-sm font-semibold flex-shrink-0">{sub}</div>
    </div>
  );
}

export default function TeamAnalytics({ allTracked, games }) {
  const gamesById = useMemo(() => {
    const map = {};
    games.forEach(g => { map[g.id] = g; });
    return map;
  }, [games]);

  const teamStats = useMemo(() => {
    const map = {};
    allTracked.forEach(tg => {
      const game = gamesById[tg.game_id];
      if (!game) return;
      const teamName = tg.picked_team === 'home' ? game.home_team : game.away_team;
      if (!map[teamName]) map[teamName] = { picks: 0, active: 0, covered: 0, totalMargin: 0 };
      map[teamName].picks++;
      if (game.status !== 'scheduled') {
        const margin = computeCoverMargin(game, tg.picked_team);
        if (margin === null) return;
        map[teamName].active++;
        map[teamName].totalMargin += margin;
        if (margin > 0) map[teamName].covered++;
      }
    });
    return Object.entries(map).map(([team, s]) => ({
      team,
      picks: s.picks,
      active: s.active,
      covered: s.covered,
      avgMargin: s.active > 0 ? s.totalMargin / s.active : null,
      coverRate: s.active > 0 ? s.covered / s.active : null,
    }));
  }, [allTracked, gamesById]);

  const mostPicked = useMemo(() => [...teamStats].sort((a, b) => b.picks - a.picks).slice(0, 8), [teamStats]);
  const byMargin = useMemo(() => teamStats.filter(t => t.active >= 1).sort((a, b) => b.avgMargin - a.avgMargin).slice(0, 8), [teamStats]);

  const maxPicks = mostPicked[0]?.picks || 1;
  const maxMargin = Math.max(...byMargin.map(t => Math.abs(t.avgMargin)), 1);

  if (teamStats.length === 0) {
    return <div className="text-center py-20 text-muted-foreground text-sm">No picks yet to analyze.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Most Picked Teams */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Most Picked Teams</h3>
          </div>
          <div className="space-y-3">
            {mostPicked.map(t => (
              <BarRow
                key={t.team}
                label={t.team}
                value={t.picks}
                max={maxPicks}
                sub={`${t.picks} pick${t.picks !== 1 ? 's' : ''}`}
                color="bg-primary"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avg Cover Margin */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Avg Cover Margin (graded picks only)</h3>
          </div>
          <div className="space-y-3">
            {byMargin.map(t => {
              const positive = t.avgMargin >= 0;
              return (
                <BarRow
                  key={t.team}
                  label={t.team}
                  value={Math.abs(t.avgMargin)}
                  max={maxMargin}
                  sub={`${positive ? '+' : ''}${t.avgMargin.toFixed(1)}`}
                  color={positive ? 'bg-primary' : 'bg-destructive'}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground pt-1">Only teams with at least 1 graded game shown.</p>
        </CardContent>
      </Card>

      {/* Cover Rate */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Group Cover Rate by Team</h3>
          </div>
          <div className="space-y-3">
            {[...byMargin].sort((a, b) => b.coverRate - a.coverRate).map(t => (
              <BarRow
                key={t.team}
                label={t.team}
                value={t.coverRate}
                max={1}
                sub={`${Math.round(t.coverRate * 100)}%`}
                color={t.coverRate >= 0.5 ? 'bg-primary' : 'bg-destructive'}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}