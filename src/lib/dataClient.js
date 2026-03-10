/**
 * dataClient — unified backend interface.
 *
 * Selects the active backend based on the VITE_BACKEND env var:
 *   VITE_BACKEND=base44    → Base44 (default, existing behaviour)
 *   VITE_BACKEND=supabase  → Supabase
 *
 * All pages and components should import from here instead of
 * directly from @/api/base44Client.
 *
 * Interface:
 *   dataClient.auth.me()
 *   dataClient.auth.updateMe(data)
 *   dataClient.auth.logout(url?)
 *   dataClient.auth.redirectToLogin(url?)
 *
 *   dataClient.Game.list(sortField?)
 *   dataClient.Game.filter(query)
 *   dataClient.Game.create(data)
 *   dataClient.Game.update(id, data)
 *   dataClient.Game.delete(id)
 *   (same for TrackedGame, User, GroupMessage)
 *
 *   dataClient.functions.invoke(name, payload)
 */

const backend = import.meta.env.VITE_BACKEND ?? 'base44';

let resolved;

if (backend === 'supabase') {
  resolved = await import('./backends/supabaseBackend.js');
} else {
  resolved = await import('./backends/base44Backend.js');
}

export const auth = resolved.auth;
export const Game = resolved.Game;
export const TrackedGame = resolved.TrackedGame;
export const User = resolved.User;
export const GroupMessage = resolved.GroupMessage;
export const functions = resolved.functions;
