import type { APIRoute } from 'astro';
import { MeiliSearch } from 'meilisearch';

const meili = new MeiliSearch({
  host: import.meta.env.MEILISEARCH_HOST ?? 'http://127.0.0.1:7700',
  apiKey: import.meta.env.MEILISEARCH_MASTER_KEY ?? '',
});

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 60, 100);
  const sortParam = url.searchParams.get('sort') ?? 'name:asc';
  const genresParam = url.searchParams.get('genres') ?? '';
  const deckParam = url.searchParams.get('deck') ?? '';

  // Build Meilisearch filters
  const filters: string[] = [];

  if (genresParam) {
    const genres = genresParam.split(',').map(g => g.trim()).filter(Boolean);
    if (genres.length > 0) {
      // OR within genres: any of the selected genres
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

  const index = meili.index('games');
  const results = await index.search(query, {
    limit,
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
    { headers: { 'Content-Type': 'application/json' } },
  );
};
