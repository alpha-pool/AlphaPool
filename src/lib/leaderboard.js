import { computeCoverMargin } from './alpha.js';

/**
 * Builds a sorted leaderboard array from tracked picks and game data.
 *
 * @param {object} opts
 * @param {Array}  opts.allTracked  - All tracked_game rows to consider
 * @param {object} opts.gamesById   - Map of game.id → game
 * @param {object} opts.usersById   - Map of user.email → user (optional)
 * @param {Function} [opts.filterGames] - Optional predicate (game) => boolean.
 *   When provided, only picks whose game passes the filter are included.
 *
 * @returns {Array} Sorted descending by totalAlpha. Entries with no matching picks are excluded.
 */
export function buildLeaderboard({ allTracked, gamesById, usersById = {}, filterGames }) {
  // Group picks by user_email (fall back to created_by for legacy rows)
  const byUser = {};
  allTracked.forEach(tg => {
    const email = tg.user_email || tg.created_by;
    if (!email) return;
    if (!byUser[email]) byUser[email] = [];
    byUser[email].push(tg);
  });

  const entries = Object.entries(byUser).map(([email, picks]) => {
    const user = usersById[email];

    // All picks for this user that pass the game filter
    const filteredPicks = filterGames
      ? picks.filter(tg => {
          const g = gamesById[tg.game_id];
          return g && filterGames(g);
        })
      : picks;

    // Active = picks whose game has started (not scheduled)
    const activePicks = filteredPicks.filter(tg => {
      const g = gamesById[tg.game_id];
      return g && g.status !== 'scheduled';
    });

    const covering = activePicks.filter(tg => {
      const g = gamesById[tg.game_id];
      const margin = computeCoverMargin(g, tg.picked_team);
      return margin !== null && margin > 0;
    }).length;

    const totalAlpha = activePicks.reduce((sum, tg) => {
      const g = gamesById[tg.game_id];
      const margin = computeCoverMargin(g, tg.picked_team);
      return sum + (margin ?? 0);
    }, 0);

    const name = user?.full_name
      || picks[0]?.user_name
      || email.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return {
      email,
      name,
      total: filteredPicks.length,
      active: activePicks.length,
      covering,
      totalAlpha,
    };
  });

  // Exclude users with no relevant picks at all
  return entries
    .filter(e => e.total > 0)
    .sort((a, b) => b.totalAlpha - a.totalAlpha);
}
