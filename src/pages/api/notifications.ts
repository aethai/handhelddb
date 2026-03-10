import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * GET /api/notifications
 * Fetch current user's notifications, ordered by created_at desc, limit 20.
 *
 * GET /api/notifications?unread=true
 * Return unread count only: { count: number }
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`notifications-get:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  if (unreadOnly) {
    // Return just the unread count
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Notification count failed:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch count' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ count: count ?? 0 }), {
      headers: JSON_HEADERS,
    });
  }

  // Fetch recent notifications
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id, type, title, body, url, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Notifications fetch failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ notifications: notifications ?? [] }), {
    headers: JSON_HEADERS,
  });
};

/**
 * PATCH /api/notifications
 * Mark a notification as read, or mark all as read.
 *
 * Body: { id: string }            — mark single notification as read
 * Body: { action: 'read_all' }    — mark all notifications as read
 */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`notifications-patch:${ip}`, 60, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Mark all as read
  if (body.action === 'read_all') {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Mark all read failed:', error);
      return new Response(JSON.stringify({ error: 'Failed to mark all as read' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ success: true, action: 'read_all' }), {
      headers: JSON_HEADERS,
    });
  }

  // Mark single notification as read
  if (!body.id) {
    return new Response(JSON.stringify({ error: 'id or action is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Verify ownership
  const { data: notification } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id')
    .eq('id', body.id)
    .single();

  if (!notification) {
    return new Response(JSON.stringify({ error: 'Notification not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (notification.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', body.id);

  if (error) {
    console.error('Mark read failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to mark as read' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true, action: 'read' }), {
    headers: JSON_HEADERS,
  });
};
