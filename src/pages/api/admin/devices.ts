import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { requireAdminApi } from '@lib/admin/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * POST /api/admin/devices
 * Create a new device.
 */
export const POST: APIRoute = async ({ cookies, request }) => {
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

  const { name, slug, manufacturer } = body;

  if (!name || !slug || !manufacturer) {
    return new Response(JSON.stringify({ error: 'name, slug, and manufacturer are required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Allowed fields for device creation
  const allowedFields = [
    'name', 'slug', 'manufacturer', 'chip', 'gpu', 'ram_gb', 'storage_gb',
    'screen_resolution', 'screen_size', 'screen_type', 'battery_wh',
    'tdp_min', 'tdp_max', 'tdp_default', 'weight_grams', 'default_os',
    'supports_windows', 'msrp_usd', 'buy_url', 'image', 'chipset_generation',
    'form_factor', 'release_date', 'is_active',
  ];

  const insertData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body && body[field] !== undefined && body[field] !== null) {
      insertData[field] = body[field];
    }
  }

  const { data: device, error } = await supabaseAdmin
    .from('devices')
    .insert(insertData)
    .select('id, name, slug')
    .single();

  if (error) {
    console.error('Admin device create failed:', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Failed to create device' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ device }), {
    status: 201,
    headers: JSON_HEADERS,
  });
};

/**
 * PATCH /api/admin/devices
 * Update an existing device.
 * Body: { deviceId: string, ...fields }
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

  const { deviceId, ...updates } = body;

  if (!deviceId || typeof deviceId !== 'string') {
    return new Response(JSON.stringify({ error: 'deviceId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const allowedFields = [
    'name', 'slug', 'manufacturer', 'chip', 'gpu', 'ram_gb', 'storage_gb',
    'screen_resolution', 'screen_size', 'screen_type', 'battery_wh',
    'tdp_min', 'tdp_max', 'tdp_default', 'weight_grams', 'default_os',
    'supports_windows', 'msrp_usd', 'buy_url', 'image', 'chipset_generation',
    'form_factor', 'release_date', 'is_active', 'discontinued',
  ];

  const safeUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in updates) {
      safeUpdates[field] = updates[field];
    }
  }

  safeUpdates.updated_at = new Date().toISOString();

  if (Object.keys(safeUpdates).length <= 1) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: device, error } = await supabaseAdmin
    .from('devices')
    .update(safeUpdates)
    .eq('id', deviceId)
    .select('id, name, slug, is_active')
    .single();

  if (error) {
    console.error('Admin device update failed:', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Failed to update device' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ device }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

/**
 * DELETE /api/admin/devices
 * Deactivate a device (set is_active = false).
 * Body: { deviceId: string }
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

  const { deviceId } = body;

  if (!deviceId || typeof deviceId !== 'string') {
    return new Response(JSON.stringify({ error: 'deviceId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { error } = await supabaseAdmin
    .from('devices')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', deviceId);

  if (error) {
    console.error('Admin device deactivate failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to deactivate device' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
