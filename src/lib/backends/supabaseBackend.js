/**
 * Supabase backend implementation.
 * Implements the same dataClient interface as base44Backend.js.
 *
 * Requires env vars:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Table names mirror entity names in snake_case:
 *   Game          → games
 *   TrackedGame   → tracked_games
 *   User          → users
 *   GroupMessage  → group_messages
 *
 * TODO: install dependency before use:
 *   npm install @supabase/supabase-js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Maps dataClient entity names to Supabase table names
const TABLE = {
  Game: 'games',
  TrackedGame: 'tracked_games',
  User: 'users',
  GroupMessage: 'group_messages',
  Pool: 'pools',
  PoolMember: 'pool_members',
};

// Maps sort field prefixes: Base44 uses "-field" for descending
function parseSort(sortField) {
  if (!sortField) return { column: 'id', ascending: true };
  const descending = sortField.startsWith('-');
  const column = descending ? sortField.slice(1) : sortField;
  return { column, ascending: !descending };
}

async function supabaseRequest(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

const makeEntityAdapter = (entityName) => ({
  list: (sortField) => {
    const { column, ascending } = parseSort(sortField);
    return supabaseRequest(
      supabase.from(TABLE[entityName]).select('*').order(column, { ascending })
    );
  },
  filter: (query) =>
    supabaseRequest(
      supabase.from(TABLE[entityName]).select('*').match(query)
    ),
  create: (data) =>
    supabaseRequest(
      supabase.from(TABLE[entityName]).insert(data).select().single()
    ),
  update: (id, data) =>
    supabaseRequest(
      supabase.from(TABLE[entityName]).update(data).eq('id', id).select().single()
    ),
  delete: (id) =>
    supabaseRequest(
      supabase.from(TABLE[entityName]).delete().eq('id', id)
    ),
});

export const auth = {
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error(error?.message ?? 'Not authenticated');
    // Fetch extended profile from users table (may not exist yet)
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    return { ...user, ...(profile ?? {}) };
  },

  updateMe: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Update extended profile in users table
    return supabaseRequest(
      supabase.from('users').update(data).eq('id', user.id).select().single()
    );
  },

  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  redirectToLogin: () => {
    window.location.href = '/login';
  },
};

export const Game = makeEntityAdapter('Game');
export const TrackedGame = makeEntityAdapter('TrackedGame');
export const User = makeEntityAdapter('User');
export const GroupMessage = makeEntityAdapter('GroupMessage');
export const Pool = {
  ...makeEntityAdapter('Pool'),
  findByInviteCode: (code) =>
    supabaseRequest(
      supabase.from('pools').select('*').eq('invite_code', code).single()
    ),
};
export const PoolMember = makeEntityAdapter('PoolMember');

export const functions = {
  // Supabase Edge Functions are invoked via the supabase client
  invoke: async (name, payload) => {
    const { data, error } = await supabase.functions.invoke(name, { body: payload });
    if (error) throw new Error(error.message);
    return data;
  },
};

export const supabaseClient = supabase;
