import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';

// ─── GET /api/devices-list ───
// Returns all active devices. Used by the DevicePicker component.
export const GET: APIRoute = async () => {
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

  return new Response(JSON.stringify({ devices: data ?? [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
