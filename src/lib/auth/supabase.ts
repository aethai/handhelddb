import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createLogger } from '@lib/logger';

const logger = createLogger('auth:supabase');

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

/**
 * Create a Supabase client that reads/writes tokens from Astro cookies.
 * Used in SSR routes to maintain auth state.
 */
export function createSupabaseServerClient(cookies: AstroCookies): SupabaseClient {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  return client;
}

/**
 * Admin client for privileged operations (user lookup, profile creation).
 */
export function getAdminClient(): SupabaseClient {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { persistSession: false },
  });
}

/**
 * Cookie options for auth tokens.
 */
const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Store auth tokens in cookies after successful authentication.
 */
export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
) {
  cookies.set('sb-access-token', accessToken, COOKIE_OPTIONS);
  cookies.set('sb-refresh-token', refreshToken, COOKIE_OPTIONS);
}

/**
 * Clear auth cookies on logout.
 */
export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
}

/**
 * Get the current user from cookies. Returns null if not authenticated.
 */
export async function getUser(cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken) return null;

  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Try setting the session
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (error || !data.session) {
    // Token might be expired — try refresh
    if (refreshToken) {
      const { data: refreshData, error: refreshError } =
        await client.auth.refreshSession({ refresh_token: refreshToken });
      if (!refreshError && refreshData.session) {
        // Update cookies with new tokens
        setAuthCookies(
          cookies,
          refreshData.session.access_token,
          refreshData.session.refresh_token!,
        );
        return refreshData.session.user;
      }
    }
    clearAuthCookies(cookies);
    return null;
  }

  return data.session.user;
}

/**
 * Ensure a user profile exists in our custom users table.
 * Called after authentication to sync Supabase auth user → our users table.
 */
export async function ensureUserProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}) {
  const admin = getAdminClient();

  const provider = authUser.app_metadata?.provider as string | undefined;
  const meta = authUser.user_metadata ?? {};

  // Check if user already exists
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .single();

  if (existing) {
    // Update last active
    await admin
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', authUser.id);
    return existing;
  }

  // Create new user profile
  const profile: Record<string, unknown> = {
    id: authUser.id,
    email: authUser.email,
    display_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
    avatar_url: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  };

  if (provider === 'google') {
    profile.google_id = meta.sub as string;
  } else if (provider === 'steam') {
    profile.steam_id = meta.sub as string;
  }

  const { data: newUser, error } = await admin.from('users').insert(profile).select().single();

  if (error) {
    logger.error('Failed to create user profile', { error: String(error) });
    return null;
  }

  return newUser;
}
