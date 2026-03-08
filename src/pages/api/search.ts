import type { APIRoute } from 'astro';
import { MeiliSearch } from 'meilisearch';

const meili = new MeiliSearch({
  host: import.meta.env.MEILISEARCH_HOST ?? 'http://127.0.0.1:7700',
  apiKey: import.meta.env.MEILISEARCH_MASTER_KEY ?? '',
});

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50);

  if (!query.trim()) {
    return new Response(JSON.stringify({ hits: [], query: '' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
