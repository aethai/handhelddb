import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

export const GET: APIRoute = async ({ url, request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`reports-get:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const gameId = url.searchParams.get('gameId');
  const deviceId = url.searchParams.get('deviceId');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const sort = url.searchParams.get('sort') ?? 'newest';

  let query = supabaseAdmin
    .from('performance_reports')
    .select('*, games(name, slug), devices(name, slug), user:users(display_name, avatar_url, username)', { count: 'exact' })
    .eq('moderation_status', 'approved');

  // Apply sort
  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (sort === 'highest_rated') {
    query = query.order('fps_avg', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  if (gameId) query = query.eq('game_id', gameId);
  if (deviceId) query = query.eq('device_id', deviceId);

  const { data, count, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data, total: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit: 20 reports per user per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`report:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate required fields
  const { gameId, deviceId, fpsAvg, overallRating } = body;
  if (!gameId || !deviceId || !fpsAvg || !overallRating) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: gameId, deviceId, fpsAvg, overallRating' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Validate game exists
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id')
    .eq('id', gameId)
    .single();
  if (!game) {
    return new Response(JSON.stringify({ error: 'Game not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate device exists
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('id, tdp_min, tdp_max')
    .eq('id', deviceId)
    .single();
  if (!device) {
    return new Response(JSON.stringify({ error: 'Device not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate enum values
  const validRatings = ['excellent', 'good', 'fair', 'poor', 'unplayable'];
  if (!validRatings.includes(overallRating as string)) {
    return new Response(JSON.stringify({ error: 'Invalid overall rating' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fpsAvgNum = Number(fpsAvg);
  if (isNaN(fpsAvgNum) || fpsAvgNum < 1 || fpsAvgNum > 240) {
    return new Response(JSON.stringify({ error: 'FPS must be between 1 and 240' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check for duplicate: one report per user per game per device
  const { data: existingReport } = await supabaseAdmin
    .from('performance_reports')
    .select('id')
    .eq('user_id', user.id)
    .eq('game_id', gameId as string)
    .eq('device_id', deviceId as string)
    .maybeSingle();

  if (existingReport) {
    return new Response(JSON.stringify({
      error: 'You already have a report for this game on this device. Edit your existing report instead.',
      existingReportId: existingReport.id,
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build insert object
  const report: Record<string, unknown> = {
    game_id: gameId,
    device_id: deviceId,
    user_id: user.id,
    fps_avg: fpsAvgNum,
    overall_rating: overallRating,
    moderation_status: 'approved',
    source: 'manual',
  };

  // Optional fields
  if (body.fpsLow != null) report.fps_low = Number(body.fpsLow);
  if (body.fpsTarget) report.fps_target = body.fpsTarget;
  if (body.fpsStability) report.fps_stability = body.fpsStability;
  if (body.resolution) report.resolution = String(body.resolution);
  if (body.preset) report.preset = body.preset;
  if (body.fsrEnabled != null) report.fsr_enabled = Boolean(body.fsrEnabled);
  if (body.fsrMode) report.fsr_mode = body.fsrMode;
  if (body.tdpLimitWatts != null) {
    const tdpVal = Number(body.tdpLimitWatts);
    if (device.tdp_min != null && device.tdp_max != null) {
      if (tdpVal < device.tdp_min || tdpVal > device.tdp_max) {
        return new Response(JSON.stringify({ error: `TDP must be between ${device.tdp_min}W and ${device.tdp_max}W for this device` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    report.tdp_limit_watts = tdpVal;
  }
  if (body.gpuClockMhz != null) report.gpu_clock_mhz = Number(body.gpuClockMhz);
  if (body.batteryLifeHours != null) report.battery_life_hours = Number(body.batteryLifeHours);
  if (body.thermal) report.thermal = body.thermal;
  if (body.fanNoise) report.fan_noise = body.fanNoise;
  if (body.controllerStatus) report.controller_status = body.controllerStatus;
  if (body.suspendStatus) report.suspend_status = body.suspendStatus;
  if (body.notes) report.notes = String(body.notes).slice(0, 2000);
  if (body.gameVersion) report.game_version = String(body.gameVersion);
  if (body.osVersion) report.os_version = String(body.osVersion);
  if (body.protonVersion) report.proton_version = String(body.protonVersion).slice(0, 100);

  if (body.customSettings && typeof body.customSettings === 'object') {
    const cs = body.customSettings as Record<string, unknown>;
    const sanitized: Record<string, string> = {};
    let count = 0;
    for (const [key, value] of Object.entries(cs)) {
      if (count >= 20) break;
      if (typeof key === 'string' && typeof value === 'string') {
        const k = key.trim().slice(0, 50);
        const v = String(value).trim().slice(0, 50);
        if (k && v) { sanitized[k] = v; count++; }
      }
    }
    if (Object.keys(sanitized).length > 0) report.custom_settings = sanitized;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('performance_reports')
    .insert(report)
    .select('id')
    .single();

  if (error) {
    console.error('Report insert failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to save report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ id: inserted.id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
