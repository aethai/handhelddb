import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';
import { createNotification, getGameSlug } from '@lib/notifications';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Recount votes from the source-of-truth table and update the denormalized counters.
 * This avoids race conditions from read-then-update patterns.
 */
async function recountReportVotes(reportId: string) {
  const { count: upvotes } = await supabaseAdmin
    .from('report_votes')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId)
    .eq('is_upvote', true);

  const { count: downvotes } = await supabaseAdmin
    .from('report_votes')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId)
    .eq('is_upvote', false);

  await supabaseAdmin
    .from('performance_reports')
    .update({ upvotes: upvotes ?? 0, downvotes: downvotes ?? 0 })
    .eq('id', reportId);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit: 60 votes per IP per 15 minutes
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`vote:${ip}`, 60, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: { reportId: string; isUpvote: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (!body.reportId || typeof body.isUpvote !== 'boolean') {
    return new Response(JSON.stringify({ error: 'reportId and isUpvote required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Check if user already voted on this report
  const { data: existing } = await supabaseAdmin
    .from('report_votes')
    .select('id, is_upvote')
    .eq('report_id', body.reportId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.is_upvote === body.isUpvote) {
      // Same vote — remove it (toggle off)
      await supabaseAdmin.from('report_votes').delete().eq('id', existing.id);
      await recountReportVotes(body.reportId);

      return new Response(JSON.stringify({ vote: null, action: 'removed' }), {
        headers: JSON_HEADERS,
      });
    } else {
      // Changed vote direction
      await supabaseAdmin
        .from('report_votes')
        .update({ is_upvote: body.isUpvote })
        .eq('id', existing.id);
      await recountReportVotes(body.reportId);

      return new Response(JSON.stringify({ vote: body.isUpvote, action: 'changed' }), {
        headers: JSON_HEADERS,
      });
    }
  }

  // New vote
  const { error } = await supabaseAdmin.from('report_votes').insert({
    report_id: body.reportId,
    user_id: user.id,
    is_upvote: body.isUpvote,
  });

  if (error) {
    console.error('Vote insert failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to save vote' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  await recountReportVotes(body.reportId);

  // Notify report author about upvotes (async, non-blocking)
  if (body.isUpvote) {
    const { data: report } = await supabaseAdmin
      .from('performance_reports')
      .select('user_id, game_id')
      .eq('id', body.reportId)
      .single();
    if (report && report.user_id && report.user_id !== user.id) {
      const slug = await getGameSlug(report.game_id);
      createNotification({
        userId: report.user_id,
        type: 'vote_received',
        title: 'Someone upvoted your performance report',
        url: slug ? `/games/${slug}` : undefined,
      });
    }
  }

  return new Response(JSON.stringify({ vote: body.isUpvote, action: 'created' }), {
    status: 201,
    headers: JSON_HEADERS,
  });
};
