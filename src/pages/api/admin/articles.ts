import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { requireAdminApi } from '@lib/admin/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * POST /api/admin/articles
 * Create a new article.
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

  const {
    title, slug, lead, body: articleBody, body_html, category, status,
    cover_image, tags, devices, meta_title, meta_description,
    published_at, ai_generated,
  } = body;

  if (!title || !slug || !lead || !articleBody || !category) {
    return new Response(JSON.stringify({ error: 'title, slug, lead, body, and category are required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const insertData: Record<string, unknown> = {
    title,
    slug,
    lead,
    body: articleBody,
    body_html: body_html ?? articleBody,
    category,
    status: status ?? 'draft',
    cover_image: cover_image ?? null,
    tags: tags ?? [],
    devices: devices ?? [],
    meta_title: meta_title ?? null,
    meta_description: meta_description ?? null,
    author_id: authResult.user.id,
    ai_generated: ai_generated ?? false,
  };

  if (published_at) {
    insertData.published_at = published_at;
  }

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert(insertData)
    .select('id, title, slug, status')
    .single();

  if (error) {
    console.error('Admin article create failed:', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Failed to create article' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ article }), {
    status: 201,
    headers: JSON_HEADERS,
  });
};

/**
 * PATCH /api/admin/articles
 * Update an existing article.
 * Body: { articleId: string, ...fields }
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

  const { articleId, ...updates } = body;

  if (!articleId || typeof articleId !== 'string') {
    return new Response(JSON.stringify({ error: 'articleId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Allowed fields
  const allowedFields = [
    'title', 'slug', 'lead', 'body', 'body_html', 'category', 'status',
    'cover_image', 'tags', 'devices', 'meta_title', 'meta_description',
    'published_at', 'updated_at',
  ];

  const safeUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in updates) {
      safeUpdates[field] = updates[field];
    }
  }

  // Always set updated_at
  safeUpdates.updated_at = new Date().toISOString();

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .update(safeUpdates)
    .eq('id', articleId)
    .select('id, title, slug, status')
    .single();

  if (error) {
    console.error('Admin article update failed:', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Failed to update article' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ article }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

/**
 * DELETE /api/admin/articles
 * Archive an article (set status = 'archived').
 * Body: { articleId: string }
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

  const { articleId } = body;

  if (!articleId || typeof articleId !== 'string') {
    return new Response(JSON.stringify({ error: 'articleId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { error } = await supabaseAdmin
    .from('articles')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', articleId);

  if (error) {
    console.error('Admin article archive failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to archive article' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
