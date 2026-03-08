import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { requireAdminApi } from '@lib/admin/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * PATCH /api/admin/users
 * Update user fields: is_banned, is_admin
 * Body: { userId: string, is_banned?: boolean, is_admin?: boolean }
 */
export const PATCH: APIRoute = async ({ cookies, request }) => {
  const authResult = await requireAdminApi(cookies);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: JSON_HEADERS,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { userId, ...updates } = body;

  if (!userId || typeof userId !== 'string') {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Only allow specific fields to be updated
  const allowedFields = ['is_banned', 'is_admin'];
  const safeUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in updates && typeof updates[field] === 'boolean') {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Prevent admin from removing their own admin status
  if ('is_admin' in safeUpdates && safeUpdates.is_admin === false && userId === authResult.user.id) {
    return new Response(JSON.stringify({ error: 'You cannot remove your own admin status' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(safeUpdates)
    .eq('id', userId)
    .select('id, display_name, is_admin, is_banned')
    .single();

  if (error) {
    console.error('Admin user update failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ user: data }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
