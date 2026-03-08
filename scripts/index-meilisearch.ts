/**
 * Index games into Meilisearch for instant search
 */
import { createClient } from '@supabase/supabase-js';
import { MeiliSearch } from 'meilisearch';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});

async function indexGames() {
  console.log('Fetching games from Supabase...');

  const { data: games, error } = await supabase
    .from('games')
    .select(
      'id, steam_appid, name, slug, short_description, header_image, capsule_image, genres, tags, developers, publishers, metacritic_score, steam_review_score, deck_compatibility, protondb_tier, is_free_to_play, performance_tier, release_date',
    );

  if (error) {
    console.error('Failed to fetch games:', error.message);
    process.exit(1);
  }

  console.log(`Fetched ${games.length} games. Configuring Meilisearch index...`);

  const index = meili.index('games');

  // Configure index settings
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
    ],
    sortableAttributes: [
      'name',
      'release_date',
      'metacritic_score',
      'steam_review_score',
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
      'developers',
      'deck_compatibility',
      'metacritic_score',
      'is_free_to_play',
    ],
  });

  console.log('Index settings configured. Adding documents...');

  // Add documents
  const task = await index.addDocuments(games, { primaryKey: 'id' });
  console.log(`Enqueued task ${task.taskUid}. Waiting for completion...`);

  // Wait for indexing to complete
  const result = await meili.waitForTask(task.taskUid, { timeOutMs: 30000 });
  console.log(`Indexing complete! Status: ${result.status}`);

  // Verify
  const stats = await index.getStats();
  console.log(`Index stats: ${stats.numberOfDocuments} documents indexed`);

  // Quick test search
  const testResult = await index.search('elden ring');
  console.log(
    `Test search "elden ring": ${testResult.hits.length} results, top: ${testResult.hits[0]?.name ?? 'none'}`,
  );

  process.exit(0);
}

indexGames().catch((err) => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
