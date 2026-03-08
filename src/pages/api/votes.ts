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

  let body: { reportId: string; isUpvote: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.reportId || typeof body.isUpvote !== 'boolean') {
    return new Response(JSON.stringify({ error: 'reportId and isUpvote required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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

      // Decrement counter on report
      const field = body.isUpvote ? 'upvotes' : 'downvotes';
      const { data: report } = await supabaseAdmin
        .from('performance_reports')
        .select(field)
        .eq('id', body.reportId)
        .single();
      if (report) {
        await supabaseAdmin
          .from('performance_reports')
          .update({ [field]: Math.max(0, (report[field] ?? 0) - 1) })
          .eq('id', body.reportId);
      }

      return new Response(JSON.stringify({ vote: null, action: 'removed' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Changed vote direction — update
      await supabaseAdmin
        .from('report_votes')
        .update({ is_upvote: body.isUpvote })
        .eq('id', existing.id);

      // Adjust counters
      const { data: report } = await supabaseAdmin
        .from('performance_reports')
        .select('upvotes, downvotes')
        .eq('id', body.reportId)
        .single();
      if (report) {
        if (body.isUpvote) {
          await supabaseAdmin
            .from('performance_reports')
            .update({
              upvotes: (report.upvotes ?? 0) + 1,
              downvotes: Math.max(0, (report.downvotes ?? 0) - 1),
            })
            .eq('id', body.reportId);
        } else {
          await supabaseAdmin
            .from('performance_reports')
            .update({
              upvotes: Math.max(0, (report.upvotes ?? 0) - 1),
              downvotes: (report.downvotes ?? 0) + 1,
            })
            .eq('id', body.reportId);
        }
      }

      return new Response(JSON.stringify({ vote: body.isUpvote, action: 'changed' }), {
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Increment counter
  const field = body.isUpvote ? 'upvotes' : 'downvotes';
  const { data: report } = await supabaseAdmin
    .from('performance_reports')
    .select(field)
    .eq('id', body.reportId)
    .single();
  if (report) {
    await supabaseAdmin
      .from('performance_reports')
      .update({ [field]: (report[field] ?? 0) + 1 })
      .eq('id', body.reportId);
  }

  return new Response(JSON.stringify({ vote: body.isUpvote, action: 'created' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
