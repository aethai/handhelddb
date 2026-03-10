import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@lib/auth/supabase';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * POST /api/auth/change-password
 * Change the current user's password (requires current password verification).
 * Body: { currentPassword, newPassword }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`change-password:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'Current and new passwords are required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (newPassword.length < 8) {
    return new Response(JSON.stringify({ error: 'New password must be at least 8 characters' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (newPassword.length > 128) {
    return new Response(JSON.stringify({ error: 'Password is too long' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (currentPassword === newPassword) {
    return new Response(JSON.stringify({ error: 'New password must be different from current password' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Verify current password by attempting to sign in
  const verifyClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false },
  });

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Update password using the verified session
  const { error: updateError } = await verifyClient.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error('Password change error:', updateError.message);
    return new Response(JSON.stringify({ error: 'Failed to update password. Please try again.' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: JSON_HEADERS,
  });
};
