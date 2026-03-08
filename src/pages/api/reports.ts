import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';

export const POST: APIRoute = async ({ request, cookies }) => {
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
    .select('id')
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
  if (isNaN(fpsAvgNum) || fpsAvgNum < 0 || fpsAvgNum > 500) {
    return new Response(JSON.stringify({ error: 'Invalid FPS value' }), {
      status: 400,
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
  if (body.tdpLimitWatts != null) report.tdp_limit_watts = Number(body.tdpLimitWatts);
  if (body.gpuClockMhz != null) report.gpu_clock_mhz = Number(body.gpuClockMhz);
  if (body.batteryLifeHours != null) report.battery_life_hours = Number(body.batteryLifeHours);
  if (body.thermal) report.thermal = body.thermal;
  if (body.fanNoise) report.fan_noise = body.fanNoise;
  if (body.controllerStatus) report.controller_status = body.controllerStatus;
  if (body.suspendStatus) report.suspend_status = body.suspendStatus;
  if (body.notes) report.notes = String(body.notes).slice(0, 2000);
  if (body.gameVersion) report.game_version = String(body.gameVersion);
  if (body.osVersion) report.os_version = String(body.osVersion);

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
