import { defineMiddleware } from 'astro:middleware';
import { getUser } from '@lib/auth/supabase';

export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
  const user = await getUser(cookies);
  locals.user = user;
  return next();
});
