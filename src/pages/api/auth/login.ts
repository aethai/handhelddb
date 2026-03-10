import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { setAuthCookies, ensureUserProfile } from '@lib/auth/supabase';
import { createLogger } from '@lib/logger';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const logger = createLogger('auth:login');

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request, cookies }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    // Rate limit: 10 login attempts per IP per 15 minutes
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, 400);
    }

    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return json({ error: 'Invalid email or password' }, 401);
      }
      if (error.message.includes('Email not confirmed')) {
        return json({ error: 'Please confirm your email address first' }, 403);
      }
      return json({ error: 'Sign in failed. Please try again.' }, 500);
    }

    if (!data.session) {
      return json({ error: 'Sign in failed. Please try again.' }, 500);
    }

    // Set auth cookies
    setAuthCookies(cookies, data.session.access_token, data.session.refresh_token!);

    // Ensure profile exists
    await ensureUserProfile(data.session.user);

    return json({ success: true });
  } catch (err) {
    logger.error('Login failed', { error: String(err) });
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};
