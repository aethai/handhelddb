import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { setAuthCookies, ensureUserProfile } from '@lib/auth/supabase';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit: 10 reset attempts per IP per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const body = await request.json();
    const { access_token, refresh_token, password } = body as {
      access_token?: string;
      refresh_token?: string;
      password?: string;
    };

    if (!access_token || !refresh_token) {
      return json({ error: 'Invalid or expired reset link. Please request a new one.' }, 400);
    }

    if (!password) {
      return json({ error: 'Password is required' }, 400);
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400);
    }

    if (password.length > 128) {
      return json({ error: 'Password is too long' }, 400);
    }

    // Create a client and set the session using recovery tokens
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    const { data: sessionData, error: sessionError } = await client.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData.session) {
      return json({ error: 'Invalid or expired reset link. Please request a new one.' }, 400);
    }

    // Update the user's password
    const { error: updateError } = await client.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      if (updateError.message.includes('same password')) {
        return json({ error: 'New password must be different from your current password.' }, 400);
      }
      return json({ error: 'Failed to update password. Please try again.' }, 500);
    }

    // Set auth cookies so user is logged in after reset
    setAuthCookies(cookies, sessionData.session.access_token, sessionData.session.refresh_token!);

    // Ensure profile exists
    await ensureUserProfile(sessionData.session.user);

    return json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};
