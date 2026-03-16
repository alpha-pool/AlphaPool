/**
 * Core alpha/spread calculation utilities shared across the app.
 */

/**
 * Returns true when a game has valid spread data.
 * spread === 0 (true pick-em) with spread_team set is considered valid.
 */
export function hasSpreadData(game) {
  return game.spread != null && game.spread_team != null;
}

/**
 * Returns the cover margin for a pick.
 * Positive = covering, 0 = push, negative = not covering.
 * Returns null if the game has no spread data.
 *
 * Scores default to 0 if not yet populated (mid-sync).
 */
export function computeCoverMargin(game, pickedTeam) {
  if (!hasSpreadData(game)) return null;
  const homeScore = game.home_score || 0;
  const awayScore = game.away_score || 0;
  const spread = game.spread;
  if (pickedTeam === 'home') {
    return game.spread_team === 'home'
      ? (homeScore - awayScore) + spread
      : (homeScore - awayScore) - spread;
  } else {
    return game.spread_team === 'away'
      ? (awayScore - homeScore) + spread
      : (awayScore - homeScore) - spread;
  }
}

/**
 * Returns true if a game is still open for picks:
 *   - status must be 'scheduled'
 *   - game_time must be in the future
 *
 * Safe when game_time is null: new Date(null) is invalid → comparison returns false (locked).
 */
export function isGamePickable(game) {
  if (game.status !== 'scheduled') return false;
  return new Date() < new Date(game.game_time);
}

/**
 * Generates a short random invite code for pools.
 * Uses an unambiguous character set (excludes 0/O/1/I).
 */
export function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
