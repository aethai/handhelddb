import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { requireAdminApi } from '@lib/admin/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * GET /api/admin/reports?status=pending&limit=50&offset=0
 * List reports filtered by moderation status.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const authResult = await requireAdminApi(cookies);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: JSON_HEADERS,
    });
  }

  const status = url.searchParams.get('status') ?? 'pending';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  let query = supabaseAdmin
    .from('performance_reports')
    .select(
      '*, games(name, slug), devices(name, slug), user:users(display_name, username)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === 'all') {
    // no filter
  } else if (status === 'flagged') {
    query = query.eq('is_flagged', true);
  } else {
    query = query.eq('moderation_status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ data, total: count }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

/**
 * PATCH /api/admin/reports
 * Update moderation_status of a performance report.
 * Body: { reportId: string, moderation_status: 'approved' | 'rejected' }
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

  const { reportId, moderation_status } = body;

  if (!reportId || typeof reportId !== 'string') {
    return new Response(JSON.stringify({ error: 'reportId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (!moderation_status || !['approved', 'rejected'].includes(moderation_status as string)) {
    return new Response(JSON.stringify({ error: 'moderation_status must be "approved" or "rejected"' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { error } = await supabaseAdmin
    .from('performance_reports')
    .update({ moderation_status: moderation_status as string })
    .eq('id', reportId);

  if (error) {
    console.error('Admin report moderation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to update report' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

/**
 * DELETE /api/admin/reports
 * Soft-delete a report by setting moderation_status to 'rejected' and is_flagged to true.
 * Body: { reportId: string }
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

  const { reportId } = body;

  if (!reportId || typeof reportId !== 'string') {
    return new Response(JSON.stringify({ error: 'reportId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Soft delete: reject and flag the report
  const { error } = await supabaseAdmin
    .from('performance_reports')
    .update({ moderation_status: 'rejected', is_flagged: true })
    .eq('id', reportId);

  if (error) {
    console.error('Admin report delete failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete report' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
