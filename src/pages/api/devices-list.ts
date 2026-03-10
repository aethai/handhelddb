import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { getCached, setCache } from '@lib/cache';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

// ─── GET /api/devices-list ───
// Returns all active devices. Used by the DevicePicker component.
export const GET: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`devices-list:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);
  const cacheKey = 'api:devices-list';
  let devices = getCached<unknown[]>(cacheKey);

  if (!devices) {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .select('id, slug, name, manufacturer, screen_size, battery_wh, chip, image')
      .eq('is_active', true)
      .order('manufacturer')
      .order('name');

    if (error) {
      console.error('Failed to fetch devices:', error);
      return new Response(JSON.stringify({ error: 'Failed to load devices' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    devices = data ?? [];
    setCache(cacheKey, devices, 600); // 10 minutes
  }

  return new Response(JSON.stringify({ devices }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
