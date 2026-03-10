import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function errorResponse(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS });
}

// ─── GET /api/my-setup ───
// Returns the authenticated user's profile, devices (with device details),
// total report count, and their 10 most recent performance reports.
export const GET: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`my-setup-get:${ip}`, 60, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  // Fetch user profile from our custom users table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, username, display_name, avatar_url, steam_id, google_id, points, level, is_verified_tester, primary_device_id, created_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return errorResponse('User profile not found', 404);
  }

  // Fetch user's devices joined with device details
  const { data: userDevices } = await supabaseAdmin
    .from('user_devices')
    .select('device_id, is_primary, devices(id, slug, name, manufacturer, screen_size, battery_wh, chip, image)')
    .eq('user_id', user.id);

  // Count total reports
  const { count: reportCount } = await supabaseAdmin
    .from('performance_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch recent reports with game and device info
  const { data: recentReports } = await supabaseAdmin
    .from('performance_reports')
    .select('id, overall_rating, fps_avg, created_at, game_id, device_id, games(slug, name, header_image), devices(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return jsonResponse({
    profile,
    devices: userDevices ?? [],
    reportCount: reportCount ?? 0,
    recentReports: recentReports ?? [],
  });
};

// ─── POST /api/my-setup ───
// Add a device to the user's setup. Body: { deviceId: string }
export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`my-setup-post:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.deviceId) {
    return errorResponse('deviceId is required', 400);
  }

  // Validate device exists
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('id')
    .eq('id', body.deviceId)
    .single();

  if (!device) {
    return errorResponse('Device not found', 404);
  }

  // Check if already added
  const { data: existing } = await supabaseAdmin
    .from('user_devices')
    .select('device_id')
    .eq('user_id', user.id)
    .eq('device_id', body.deviceId)
    .single();

  if (existing) {
    return errorResponse('Device already in your setup', 409);
  }

  // Check how many devices the user already has to determine is_primary
  const { count: deviceCount } = await supabaseAdmin
    .from('user_devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const isPrimary = (deviceCount ?? 0) === 0;

  const { error } = await supabaseAdmin
    .from('user_devices')
    .insert({
      user_id: user.id,
      device_id: body.deviceId,
      is_primary: isPrimary,
    });

  if (error) {
    console.error('Failed to add device:', error);
    return errorResponse('Failed to add device', 500);
  }

  // If this is the first device, also set it as primary_device_id on the user
  if (isPrimary) {
    await supabaseAdmin
      .from('users')
      .update({ primary_device_id: body.deviceId })
      .eq('id', user.id);
  }

  return jsonResponse({ success: true, isPrimary }, 201);
};

// ─── DELETE /api/my-setup ───
// Remove a device from the user's setup. Query: ?deviceId=xxx
export const DELETE: APIRoute = async ({ request, url, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`my-setup-delete:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  const deviceId = url.searchParams.get('deviceId');
  if (!deviceId) {
    return errorResponse('deviceId query parameter is required', 400);
  }

  // Check that the device is in the user's setup
  const { data: existing } = await supabaseAdmin
    .from('user_devices')
    .select('device_id, is_primary')
    .eq('user_id', user.id)
    .eq('device_id', deviceId)
    .single();

  if (!existing) {
    return errorResponse('Device not in your setup', 404);
  }

  const { error } = await supabaseAdmin
    .from('user_devices')
    .delete()
    .eq('user_id', user.id)
    .eq('device_id', deviceId);

  if (error) {
    console.error('Failed to remove device:', error);
    return errorResponse('Failed to remove device', 500);
  }

  // If the removed device was primary, promote the next one (or clear)
  if (existing.is_primary) {
    const { data: nextDevice } = await supabaseAdmin
      .from('user_devices')
      .select('device_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (nextDevice) {
      await supabaseAdmin
        .from('user_devices')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('device_id', nextDevice.device_id);

      await supabaseAdmin
        .from('users')
        .update({ primary_device_id: nextDevice.device_id })
        .eq('id', user.id);
    } else {
      await supabaseAdmin
        .from('users')
        .update({ primary_device_id: null })
        .eq('id', user.id);
    }
  }

  return jsonResponse({ success: true });
};

// ─── PATCH /api/my-setup ───
// Update user profile fields: displayName, username. Body: { displayName?, username? }
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`my-setup-patch:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  let body: { displayName?: string; username?: string; notifyOnReply?: boolean; notifyOnVote?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const updates: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    const name = String(body.displayName).trim();
    if (name.length < 1 || name.length > 50) {
      return errorResponse('Display name must be 1-50 characters', 400);
    }
    updates.display_name = name;
  }

  if (body.username !== undefined) {
    const uname = String(body.username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(uname)) {
      return errorResponse('Username must be 3-24 characters: letters, numbers, underscores only', 400);
    }

    // Check uniqueness
    const { data: taken } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', uname)
      .neq('id', user.id)
      .single();

    if (taken) {
      return errorResponse('Username is already taken', 409);
    }

    updates.username = uname;
  }

  if (typeof body.notifyOnReply === 'boolean') {
    updates.notify_on_reply = body.notifyOnReply;
  }

  if (typeof body.notifyOnVote === 'boolean') {
    updates.notify_on_vote = body.notifyOnVote;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400);
  }

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('id, username, display_name')
    .single();

  if (error) {
    console.error('Profile update failed:', error);
    return errorResponse('Failed to update profile', 500);
  }

  return jsonResponse({ success: true, profile: updated });
};
