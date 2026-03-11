/**
 * Phase 2: Clean junk games from database.
 *
 * Removes games that have:
 * - No Metacritic score AND
 * - Deck compatibility = 'unknown' or 'unsupported'
 *
 * These are low-quality entries with no validation from either Metacritic
 * reviewers or Valve's Deck compatibility testing.
 *
 * Keeps: Games with Metacritic score OR Deck verified/playable.
 *
 * Run: cd /home/ubuntu/handhelddb && npx tsx scripts/clean-junk-games.ts
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function main() {
  console.log('=== Phase 2: Clean Junk Games ===\n');

  // Count before
  const { count: totalBefore } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });
  console.log(`Games before: ${totalBefore}`);

  // Find junk games: no Metacritic + unknown/unsupported deck compat
  // We need to get their IDs first to clean up references
  console.log('\nFinding junk games (no Metacritic + unknown/unsupported compat)...');

  // Fetch in batches since there could be thousands
  let allJunkIds: string[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch } = await supabase
      .from('games')
      .select('id')
      .is('metacritic_score', null)
      .in('deck_compatibility', ['unknown', 'unsupported'])
      .range(offset, offset + batchSize - 1);

    if (!batch || batch.length === 0) break;
    allJunkIds.push(...batch.map(g => g.id));
    offset += batchSize;
    if (batch.length < batchSize) break;
  }

  console.log(`Found ${allJunkIds.length} junk games to remove\n`);

  if (allJunkIds.length === 0) {
    console.log('Nothing to clean!');
    return;
  }

  // Delete referencing rows in batches of 200 (Supabase .in() limit)
  const BATCH = 200;
  const refTables = [
    'game_follows',
    'comments',       // has game_id FK
    'game_versions',  // has game_id FK with cascade, but let's be explicit
    'settings_presets',
  ];

  for (const table of refTables) {
    let deleted = 0;
    for (let i = 0; i < allJunkIds.length; i += BATCH) {
      const chunk = allJunkIds.slice(i, i + BATCH);
      const { error } = await supabase
        .from(table)
        .delete()
        .in('game_id', chunk);
      if (error && !error.message.includes('does not exist')) {
        console.error(`  ${table} batch error: ${error.message}`);
      } else {
        deleted++;
      }
    }
    console.log(`  ${table}: cleaned (${deleted} batches)`);
  }

  // Delete the games themselves in batches
  console.log('\nDeleting junk games...');
  let gamesDeleted = 0;
  for (let i = 0; i < allJunkIds.length; i += BATCH) {
    const chunk = allJunkIds.slice(i, i + BATCH);
    const { error } = await supabase
      .from('games')
      .delete()
      .in('id', chunk);
    if (error) {
      console.error(`  Batch ${i / BATCH + 1} error: ${error.message}`);
    } else {
      gamesDeleted += chunk.length;
    }
    // Log progress every 1000
    if (gamesDeleted % 1000 === 0 && gamesDeleted > 0) {
      console.log(`  Progress: ${gamesDeleted}/${allJunkIds.length}`);
    }
  }
  console.log(`  Deleted ${gamesDeleted} games`);

  // Verify
  const { count: totalAfter } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });
  console.log(`\n=== Results ===`);
  console.log(`  Before: ${totalBefore}`);
  console.log(`  Removed: ${gamesDeleted}`);
  console.log(`  After: ${totalAfter}`);

  // Breakdown of what remains
  const { count: withMc } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .not('metacritic_score', 'is', null);
  const { count: deckVerified } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('deck_compatibility', 'verified');
  const { count: deckPlayable } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('deck_compatibility', 'playable');

  console.log(`\n  With Metacritic: ${withMc}`);
  console.log(`  Deck Verified: ${deckVerified}`);
  console.log(`  Deck Playable: ${deckPlayable}`);

  console.log('\nPhase 2 complete!');
}

main().catch((err) => {
  console.error('Clean failed:', err);
  process.exit(1);
});
