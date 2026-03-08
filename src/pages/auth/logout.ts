import type { APIRoute } from 'astro';
import { clearAuthCookies } from '@lib/auth/supabase';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  clearAuthCookies(cookies);
  return redirect('/');
};
