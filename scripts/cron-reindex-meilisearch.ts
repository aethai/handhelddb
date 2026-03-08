/**
 * Cron: Reindex Meilisearch with all games
 *
 * Fetches ALL games from Supabase and replaces the entire 'games' index
 * in Meilisearch. Configures searchable, filterable, and sortable attributes.
 *
 * Schedule: every 6 hours
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { MeiliSearch } from 'meilisearch';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Meilisearch reindex starting...`);

  // Fetch ALL games from Supabase
  // Supabase returns max 1000 per request, so we paginate
  const allGames: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('games')
      .select(
        'id, steam_appid, name, slug, short_description, header_image, capsule_image, genres, tags, developers, publishers, metacritic_score, steam_review_score, deck_compatibility, protondb_tier, is_free_to_play, performance_tier, release_date, price_usd, hltb_main_hours',
      )
      .range(offset, offset + PAGE_SIZE - 1)
      .order('name');

    if (error) {
      console.error('Failed to fetch games:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allGames.push(...data);
    console.log(`  Fetched ${allGames.length} games so far...`);

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`\nTotal games fetched: ${allGames.length}`);

  if (allGames.length === 0) {
    console.log('No games found, skipping reindex.');
    process.exit(0);
  }

  const index = meili.index('games');

  // Configure index settings
  console.log('Configuring index settings...');
  await index.updateSettings({
    searchableAttributes: [
      'name',
      'short_description',
      'developers',
      'publishers',
      'genres',
      'tags',
    ],
    filterableAttributes: [
      'genres',
      'deck_compatibility',
      'protondb_tier',
      'is_free_to_play',
      'performance_tier',
      'developers',
      'tags',
    ],
    sortableAttributes: [
      'name',
      'release_date',
      'metacritic_score',
      'steam_review_score',
      'price_usd',
      'hltb_main_hours',
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ],
    displayedAttributes: [
      'id',
      'steam_appid',
      'name',
      'slug',
      'short_description',
      'header_image',
      'capsule_image',
      'genres',
      'tags',
      'developers',
      'publishers',
      'deck_compatibility',
      'protondb_tier',
      'metacritic_score',
      'steam_review_score',
      'is_free_to_play',
      'performance_tier',
      'price_usd',
      'release_date',
      'hltb_main_hours',
    ],
  });

  // Replace all documents (addDocuments with primaryKey replaces existing docs with same key)
  console.log(`Adding ${allGames.length} documents to index...`);
  const task = await index.addDocuments(allGames, { primaryKey: 'id' });
  console.log(`Enqueued task ${task.taskUid}. Waiting for completion...`);

  const result = await meili.waitForTask(task.taskUid, { timeOutMs: 60000 });
  console.log(`Indexing status: ${result.status}`);

  if (result.status === 'failed') {
    console.error('Indexing failed:', result.error);
    process.exit(1);
  }

  // Verify
  const stats = await index.getStats();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nMeilisearch reindex complete in ${elapsed}s`);
  console.log(`  Documents indexed: ${stats.numberOfDocuments}`);
  console.log(`  Field distribution: ${JSON.stringify(stats.fieldDistribution)}`);
}

main().catch((err) => {
  console.error('Meilisearch reindex failed:', err);
  process.exit(1);
});
