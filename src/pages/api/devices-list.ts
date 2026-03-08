import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { getCached, setCache } from '@lib/cache';

// ─── GET /api/devices-list ───
// Returns all active devices. Used by the DevicePicker component.
export const GET: APIRoute = async () => {
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
