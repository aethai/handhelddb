import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

export const GET: APIRoute = async ({ url, request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`consensus:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const gameSlug = url.searchParams.get('game');
  const deviceSlug = url.searchParams.get('device');

  if (!gameSlug) {
    return new Response(JSON.stringify({ error: 'game parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Resolve game ID from slug
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .single();

  if (!game) {
    return new Response(JSON.stringify({ data: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build query
  let query = supabaseAdmin
    .from('consensus_ratings')
    .select('fps_avg, fps_low, recommended_preset, recommended_resolution, recommended_tdp, estimated_battery, typical_thermal, typical_fan_noise, overall_verdict, report_count, confidence_level, weighted_score, recommended_profile, devices(slug, name)')
    .eq('game_id', game.id);

  if (deviceSlug) {
    // Resolve device ID
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('slug', deviceSlug)
      .single();

    if (device) {
      query = query.eq('device_id', device.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch consensus' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: data ?? [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
  });
};
