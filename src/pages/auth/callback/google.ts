import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { setAuthCookies, ensureUserProfile } from '@lib/auth/supabase';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const redirectTo = url.searchParams.get('redirect') ?? '/';
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://handheldgamedb.com';

  // If no code, initiate the OAuth flow
  if (!code) {
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback/google?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error || !data.url) {
      console.error('OAuth initiation failed:', error);
      return redirect('/auth/login?error=oauth_failed');
    }

    return redirect(data.url);
  }

  // Exchange code for session
  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, flowType: 'pkce' },
  });

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error('Code exchange failed:', error);
    return redirect('/auth/login?error=exchange_failed');
  }

  // Store tokens in cookies
  setAuthCookies(cookies, data.session.access_token, data.session.refresh_token!);

  // Ensure user profile exists in our custom table
  await ensureUserProfile(data.session.user);

  // Redirect to the original destination
  return redirect(redirectTo);
};
