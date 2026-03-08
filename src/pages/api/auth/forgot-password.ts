import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://handheldgamedb.com';

/**
 * Simple in-memory rate limiter: max 3 requests per email per 10 minutes.
 */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  const timestamps = rateLimitMap.get(key) ?? [];

  // Remove entries older than the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(key, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(key, recent);
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return json({ error: 'Email is required' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    // Rate limit check — always return success to avoid revealing if email exists
    if (isRateLimited(email)) {
      return json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    // Send password reset email via Supabase
    // This won't reveal whether the email exists — Supabase handles it gracefully
    await client.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    // Always return success to avoid email enumeration
    return json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    // Still return success to avoid leaking info
    return json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  }
};
