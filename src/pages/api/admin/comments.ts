import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { requireAdminApi } from '@lib/admin/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * DELETE /api/admin/comments
 * Soft-delete a comment by setting is_deleted = true.
 * Body: { commentId: string }
 */
export const DELETE: APIRoute = async ({ cookies, request }) => {
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

  const { commentId } = body;

  if (!commentId || typeof commentId !== 'string') {
    return new Response(JSON.stringify({ error: 'commentId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Soft delete: set is_deleted = true
  const { error } = await supabaseAdmin
    .from('comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) {
    console.error('Admin comment delete failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete comment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
