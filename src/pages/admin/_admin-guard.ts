import { supabaseAdmin } from '@lib/db/client';

/**
 * Require the current user to be an admin.
 * Returns a redirect Response if not authenticated or not admin.
 * Returns null if the user is a valid admin (proceed with page render).
 *
 * Usage in .astro frontmatter:
 *   const redirect = await requireAdmin(Astro);
 *   if (redirect) return redirect;
 */
export async function requireAdmin(Astro: any) {
  const user = Astro.locals.user;
  if (!user) return Astro.redirect('/auth/login');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return Astro.redirect('/');
  return null;
}
