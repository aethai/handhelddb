import type { APIRoute } from 'astro';
import { MeiliSearch } from 'meilisearch';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const meili = new MeiliSearch({
  host: import.meta.env.MEILISEARCH_HOST ?? 'http://127.0.0.1:7700',
  apiKey: import.meta.env.MEILISEARCH_MASTER_KEY ?? '',
});

export const GET: APIRoute = async ({ url, request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`search:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);
  const rawQuery = url.searchParams.get('q') ?? '';
  const query = rawQuery.replace(/[%_]/g, '').slice(0, 100);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50);

  if (!query.trim() || query.trim().length < 2) {
    return new Response(JSON.stringify({ hits: [], query: '' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Try Meilisearch first, fall back to Supabase ilike search
  try {
    const index = meili.index('games');
    const results = await index.search(query, {
      limit,
      attributesToRetrieve: [
        'id',
        'name',
        'slug',
        'header_image',
        'capsule_image',
        'genres',
        'developers',
        'deck_compatibility',
        'metacritic_score',
      ],
    });

    return new Response(
      JSON.stringify({
        hits: results.hits,
        query: results.query,
        processingTimeMs: results.processingTimeMs,
        estimatedTotalHits: results.estimatedTotalHits,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' },
      },
    );
  } catch {
    // Meilisearch unavailable — fallback to Supabase text search
    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name, slug, header_image, capsule_image, genres, developers, deck_compatibility, metacritic_score')
      .ilike('name', `%${query}%`)
      .order('metacritic_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    return new Response(
      JSON.stringify({
        hits: games ?? [],
        query,
        processingTimeMs: 0,
        estimatedTotalHits: games?.length ?? 0,
        fallback: true,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' },
      },
    );
  }
};
