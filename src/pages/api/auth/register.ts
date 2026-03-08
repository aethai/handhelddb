import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { setAuthCookies, ensureUserProfile } from '@lib/auth/supabase';

const supabaseUrl = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request, cookies }) => {
  const json = (headers: Record<string, string>, body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

  try {
    const body = await request.json();
    const { email, password, displayName } = body as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    // Validate
    if (!email || !password) {
      return json({}, { error: 'Email and password are required' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({}, { error: 'Invalid email address' }, 400);
    }

    if (password.length < 8) {
      return json({}, { error: 'Password must be at least 8 characters' }, 400);
    }

    if (password.length > 128) {
      return json({}, { error: 'Password is too long' }, 400);
    }

    const trimmedName = displayName?.trim().slice(0, 50) || null;

    // Create user with admin API (auto-confirms email)
    const admin = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false },
    });

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedName,
      },
    });

    if (createError) {
      // Handle duplicate email
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        return json({}, { error: 'An account with this email already exists. Try signing in instead.' }, 409);
      }
      console.error('Registration error:', createError.message);
      return json({}, { error: 'Registration failed. Please try again.' }, 500);
    }

    if (!createData.user) {
      return json({}, { error: 'Registration failed. Please try again.' }, 500);
    }

    // Sign in immediately to get a session
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (signInError || !signInData.session) {
      // User created but couldn't sign in — still success, user can sign in manually
      return json({}, { success: true, message: 'Account created. Please sign in.' });
    }

    // Set auth cookies
    setAuthCookies(cookies, signInData.session.access_token, signInData.session.refresh_token!);

    // Ensure user profile in our custom table
    await ensureUserProfile(signInData.session.user);

    return json({}, { success: true });
  } catch (err) {
    console.error('Registration error:', err);
    return json({}, { error: 'Something went wrong. Please try again.' }, 500);
  }
};
