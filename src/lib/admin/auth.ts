import type { AstroCookies } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';

/**
 * Check that the request comes from an authenticated admin user.
 * Used in API routes under /api/admin/*.
 *
 * Returns { user } on success, or { error, status } on failure.
 */
export async function requireAdminApi(cookies: AstroCookies) {
  const user = await getUser(cookies);
  if (!user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!data?.is_admin) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { user } as const;
}
