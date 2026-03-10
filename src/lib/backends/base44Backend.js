/**
 * Base44 backend adapter.
 * Wraps the existing base44 SDK to match the dataClient interface.
 * No logic changes — purely delegates to the original SDK.
 */
import { base44 } from '@/api/base44Client';

const makeEntityAdapter = (entityName) => ({
  list: (sortField) => base44.entities[entityName].list(sortField),
  filter: (query) => base44.entities[entityName].filter(query),
  create: (data) => base44.entities[entityName].create(data),
  update: (id, data) => base44.entities[entityName].update(id, data),
  delete: (id) => base44.entities[entityName].delete(id),
});

export const auth = {
  me: () => base44.auth.me(),
  updateMe: (data) => base44.auth.updateMe(data),
  logout: (url) => base44.auth.logout(url),
  redirectToLogin: (url) => base44.auth.redirectToLogin(url),
};

export const Game = makeEntityAdapter('Game');
export const TrackedGame = makeEntityAdapter('TrackedGame');
export const User = makeEntityAdapter('User');
export const GroupMessage = makeEntityAdapter('GroupMessage');

export const functions = {
  invoke: (name, payload) => base44.functions.invoke(name, payload),
};
