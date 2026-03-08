import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_DEPTH = 3;
const DEFAULT_LIMIT = 20;
const MAX_BODY_LENGTH = 5000;

/**
 * Escape HTML tags and convert newlines to <br> for safe rendering.
 */
function bodyToHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * GET /api/comments?gameId=xxx&offset=0&limit=20
 * Fetch comments for a game with user info, ordered by created_at desc.
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameId = url.searchParams.get('gameId');

  if (!gameId) {
    return new Response(JSON.stringify({ error: 'gameId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  // Fetch comments with user info
  const { data: comments, error } = await supabaseAdmin
    .from('comments')
    .select('id, game_id, user_id, parent_id, depth, body, body_html, upvotes, downvotes, is_edited, is_deleted, is_flagged, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Comments fetch failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  if (!comments || comments.length === 0) {
    return new Response(JSON.stringify({ comments: [], total: 0 }), {
      headers: JSON_HEADERS,
    });
  }

  // Get total count for pagination
  const { count: total } = await supabaseAdmin
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId);

  // Fetch user profiles for all comment authors
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const userMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (users) {
    for (const u of users) {
      userMap.set(u.id, { display_name: u.display_name, avatar_url: u.avatar_url });
    }
  }

  // Merge user info into comments
  const enriched = comments.map(c => {
    const user = userMap.get(c.user_id);
    return {
      ...c,
      // Redact body for deleted comments
      body: c.is_deleted ? null : c.body,
      body_html: c.is_deleted ? null : c.body_html,
      user: c.is_deleted
        ? { display_name: null, avatar_url: null }
        : {
            display_name: user?.display_name ?? 'Anonymous',
            avatar_url: user?.avatar_url ?? null,
          },
    };
  });

  return new Response(JSON.stringify({ comments: enriched, total: total ?? 0 }), {
    headers: JSON_HEADERS,
  });
};

/**
 * POST /api/comments
 * Create a comment or vote on a comment.
 *
 * Body for comment: { gameId, body, parentId? }
 * Body for vote:    { action: "vote", commentId, isUpvote }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Route to vote handler
  if (body.action === 'vote') {
    return handleVote(body, user.id);
  }

  // --- Create comment ---
  const { gameId, body: commentBody, parentId } = body as {
    gameId?: string;
    body?: string;
    parentId?: string;
  };

  if (!gameId || typeof commentBody !== 'string' || !commentBody.trim()) {
    return new Response(JSON.stringify({ error: 'gameId and body are required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const trimmedBody = commentBody.trim().slice(0, MAX_BODY_LENGTH);

  // Determine depth from parent
  let depth = 0;
  if (parentId) {
    const { data: parent } = await supabaseAdmin
      .from('comments')
      .select('id, depth, game_id')
      .eq('id', parentId)
      .single();

    if (!parent) {
      return new Response(JSON.stringify({ error: 'Parent comment not found' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    if (parent.game_id !== gameId) {
      return new Response(JSON.stringify({ error: 'Parent comment belongs to a different game' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    depth = Math.min((parent.depth ?? 0) + 1, MAX_DEPTH);
  }

  const bodyHtml = bodyToHtml(trimmedBody);

  const { data: inserted, error } = await supabaseAdmin
    .from('comments')
    .insert({
      game_id: gameId,
      user_id: user.id,
      parent_id: parentId || null,
      depth,
      body: trimmedBody,
      body_html: bodyHtml,
      upvotes: 0,
      downvotes: 0,
      is_edited: false,
      is_deleted: false,
      is_flagged: false,
    })
    .select('id, game_id, user_id, parent_id, depth, body, body_html, upvotes, downvotes, is_edited, is_deleted, is_flagged, created_at')
    .single();

  if (error) {
    console.error('Comment insert failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to save comment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  // Fetch user profile for the response
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return new Response(
    JSON.stringify({
      comment: {
        ...inserted,
        user: {
          display_name: userProfile?.display_name ?? 'Anonymous',
          avatar_url: userProfile?.avatar_url ?? null,
        },
      },
    }),
    { status: 201, headers: JSON_HEADERS },
  );
};

/**
 * DELETE /api/comments?id=xxx
 * Soft delete a comment (only by the comment author).
 */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const url = new URL(request.url);
  const commentId = url.searchParams.get('id');
  if (!commentId) {
    return new Response(JSON.stringify({ error: 'Comment id is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Verify ownership
  const { data: comment } = await supabaseAdmin
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return new Response(JSON.stringify({ error: 'Comment not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (comment.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Not authorized to delete this comment' }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  const { error } = await supabaseAdmin
    .from('comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) {
    console.error('Comment delete failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete comment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: JSON_HEADERS,
  });
};

/**
 * Handle vote on a comment. Toggle logic matching report votes.
 */
async function handleVote(body: Record<string, unknown>, userId: string): Promise<Response> {
  const { commentId, isUpvote } = body as { commentId?: string; isUpvote?: boolean };

  if (!commentId || typeof isUpvote !== 'boolean') {
    return new Response(JSON.stringify({ error: 'commentId and isUpvote required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Check if user already voted
  const { data: existing } = await supabaseAdmin
    .from('comment_votes')
    .select('comment_id, user_id, is_upvote')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.is_upvote === isUpvote) {
      // Same vote -- toggle off (remove)
      await supabaseAdmin
        .from('comment_votes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      // Decrement counter
      const { data: comment } = await supabaseAdmin
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();
      if (comment) {
        if (isUpvote) {
          await supabaseAdmin
            .from('comments')
            .update({ upvotes: Math.max(0, (comment.upvotes ?? 0) - 1) })
            .eq('id', commentId);
        } else {
          await supabaseAdmin
            .from('comments')
            .update({ downvotes: Math.max(0, (comment.downvotes ?? 0) - 1) })
            .eq('id', commentId);
        }
      }

      return new Response(JSON.stringify({ vote: null, action: 'removed' }), {
        headers: JSON_HEADERS,
      });
    } else {
      // Changed vote direction
      await supabaseAdmin
        .from('comment_votes')
        .update({ is_upvote: isUpvote })
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      // Adjust counters
      const { data: comment } = await supabaseAdmin
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();
      if (comment) {
        if (isUpvote) {
          await supabaseAdmin
            .from('comments')
            .update({
              upvotes: (comment.upvotes ?? 0) + 1,
              downvotes: Math.max(0, (comment.downvotes ?? 0) - 1),
            })
            .eq('id', commentId);
        } else {
          await supabaseAdmin
            .from('comments')
            .update({
              upvotes: Math.max(0, (comment.upvotes ?? 0) - 1),
              downvotes: (comment.downvotes ?? 0) + 1,
            })
            .eq('id', commentId);
        }
      }

      return new Response(JSON.stringify({ vote: isUpvote, action: 'changed' }), {
        headers: JSON_HEADERS,
      });
    }
  }

  // New vote
  const { error } = await supabaseAdmin.from('comment_votes').insert({
    comment_id: commentId,
    user_id: userId,
    is_upvote: isUpvote,
  });

  if (error) {
    console.error('Comment vote insert failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to save vote' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  // Increment counter
  const { data: comment } = await supabaseAdmin
    .from('comments')
    .select('upvotes, downvotes')
    .eq('id', commentId)
    .single();
  if (comment) {
    if (isUpvote) {
      await supabaseAdmin
        .from('comments')
        .update({ upvotes: (comment.upvotes ?? 0) + 1 })
        .eq('id', commentId);
    } else {
      await supabaseAdmin
        .from('comments')
        .update({ downvotes: (comment.downvotes ?? 0) + 1 })
        .eq('id', commentId);
    }
  }

  return new Response(JSON.stringify({ vote: isUpvote, action: 'created' }), {
    status: 201,
    headers: JSON_HEADERS,
  });
}
