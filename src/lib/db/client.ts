import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Public client with anon key (respects RLS)
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
