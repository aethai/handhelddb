import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * GET /api/follows?gameId=xxx
 * Check if the current user follows a game.
 * Returns { following: boolean, followerCount: number }
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const gameId = url.searchParams.get('gameId');

  if (!gameId) {
    return new Response(JSON.stringify({ error: 'gameId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Get follower count regardless of auth
  const { count: followerCount } = await supabaseAdmin
    .from('game_follows')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(
      JSON.stringify({ following: false, followerCount: followerCount ?? 0 }),
      { headers: JSON_HEADERS },
    );
  }

  const { data: follow } = await supabaseAdmin
    .from('game_follows')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .maybeSingle();

  return new Response(
    JSON.stringify({ following: !!follow, followerCount: followerCount ?? 0 }),
    { headers: JSON_HEADERS },
  );
};

/**
 * POST /api/follows
 * Toggle follow on a game (insert if not exists, delete if exists).
 * Body: { gameId: string }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: { gameId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (!body.gameId) {
    return new Response(JSON.stringify({ error: 'gameId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Check if already following
  const { data: existing } = await supabaseAdmin
    .from('game_follows')
    .select('id')
    .eq('game_id', body.gameId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unfollow — delete
    const { error } = await supabaseAdmin
      .from('game_follows')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('Unfollow failed:', error);
      return new Response(JSON.stringify({ error: 'Failed to unfollow' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    // Get updated count
    const { count } = await supabaseAdmin
      .from('game_follows')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', body.gameId);

    return new Response(
      JSON.stringify({ following: false, action: 'unfollowed', followerCount: count ?? 0 }),
      { headers: JSON_HEADERS },
    );
  }

  // Follow — insert
  const { error } = await supabaseAdmin.from('game_follows').insert({
    game_id: body.gameId,
    user_id: user.id,
  });

  if (error) {
    console.error('Follow insert failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to follow' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  // Get updated count
  const { count } = await supabaseAdmin
    .from('game_follows')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', body.gameId);

  return new Response(
    JSON.stringify({ following: true, action: 'followed', followerCount: count ?? 0 }),
    { status: 201, headers: JSON_HEADERS },
  );
};
