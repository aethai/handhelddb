import type { APIRoute } from 'astro';
import { MeiliSearch } from 'meilisearch';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const meili = new MeiliSearch({
  host: import.meta.env.MEILISEARCH_HOST ?? 'http://127.0.0.1:7700',
  apiKey: import.meta.env.MEILISEARCH_MASTER_KEY ?? '',
});

export const GET: APIRoute = async ({ url, request }) => {
  // Rate limit: 120 requests per IP per 15 minutes
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`games-search:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const query = url.searchParams.get('q') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 60, 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const sortParam = url.searchParams.get('sort') ?? 'name:asc';
  const genresParam = url.searchParams.get('genres') ?? '';
  const deckParam = url.searchParams.get('deck') ?? '';

  // Build Meilisearch filters
  const filters: string[] = [];

  if (genresParam) {
    const genres = genresParam.split(',').map(g => g.trim()).filter(Boolean);
    if (genres.length > 0) {
      const genreFilters = genres.map(g => `genres = "${g}"`);
      filters.push(`(${genreFilters.join(' OR ')})`);
    }
  }

  if (deckParam) {
    const decks = deckParam.split(',').map(d => d.trim()).filter(Boolean);
    if (decks.length > 0) {
      const deckFilters = decks.map(d => `deck_compatibility = "${d}"`);
      filters.push(`(${deckFilters.join(' OR ')})`);
    }
  }

  try {
    const index = meili.index('games');
    const results = await index.search(query, {
      limit,
      offset,
      sort: [sortParam],
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      attributesToRetrieve: [
        'id', 'name', 'slug', 'header_image', 'capsule_image',
        'genres', 'developers', 'deck_compatibility', 'metacritic_score', 'is_free_to_play',
      ],
    });

    return new Response(
      JSON.stringify({
        hits: results.hits,
        query: results.query,
        processingTimeMs: results.processingTimeMs,
        estimatedTotalHits: results.estimatedTotalHits,
      }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } },
    );
  } catch (err) {
    // Fallback to Supabase if Meilisearch is down
    console.error('Meilisearch games-search failed, falling back to Supabase:', err);
    let sbQuery = supabaseAdmin
      .from('games')
      .select('id, name, slug, header_image, capsule_image, genres, developers, deck_compatibility, metacritic_score, is_free_to_play');

    if (query) {
      sbQuery = sbQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await sbQuery.order('name').range(offset, offset + limit - 1);
    if (error) {
      return new Response(JSON.stringify({ error: 'Search unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        hits: data ?? [],
        query,
        processingTimeMs: 0,
        estimatedTotalHits: (data ?? []).length,
      }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } },
    );
  }
};
