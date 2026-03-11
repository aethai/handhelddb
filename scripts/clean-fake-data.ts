/**
 * Phase 1: Nuclear Clean — Delete all fake/seed data.
 *
 * Removes: report_votes, performance_reports, consensus_ratings,
 * fake users (no email/google_id/steam_id), and related orphan rows.
 * Resets game cached_stats and performance_tier.
 *
 * Run: cd /home/ubuntu/handhelddb && npx tsx scripts/clean-fake-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function deleteAll(table: string, filter?: (q: any) => any) {
  // Supabase delete requires a filter, so we use id != impossible UUID
  let q = supabase.from(table).delete();
  if (filter) {
    q = filter(q);
  } else {
    q = q.neq('id', '00000000-0000-0000-0000-000000000000');
  }
  const { error, count } = await q.select('*', { count: 'exact', head: true });
  // The delete already happened, count is in the response
  return { error };
}

async function main() {
  console.log('=== Phase 1: Nuclear Clean — Delete Fake Data ===\n');

  // Step 1: Delete report votes (references performance_reports)
  console.log('1. Deleting report_votes...');
  const { error: e1 } = await supabase
    .from('report_votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('   ERROR:', e1.message);
  else console.log('   Done.');

  // Step 2: Delete all performance reports
  console.log('2. Deleting performance_reports...');
  const { error: e2 } = await supabase
    .from('performance_reports')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.error('   ERROR:', e2.message);
  else console.log('   Done.');

  // Step 3: Delete all consensus ratings
  console.log('3. Deleting consensus_ratings...');
  const { error: e3 } = await supabase
    .from('consensus_ratings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e3) console.error('   ERROR:', e3.message);
  else console.log('   Done.');

  // Step 4: Get fake user IDs (no email, no google_id, no steam_id)
  console.log('4. Finding fake users...');
  const { data: fakeUsers } = await supabase
    .from('users')
    .select('id')
    .is('email', null)
    .is('google_id', null)
    .is('steam_id', null);

  const fakeIds = (fakeUsers ?? []).map(u => u.id);
  console.log(`   Found ${fakeIds.length} fake users`);

  if (fakeIds.length > 0) {
    // Delete referencing rows for each fake user
    console.log('5. Deleting fake user references...');

    for (const table of ['user_devices', 'game_follows', 'user_badges', 'comments', 'comment_votes', 'comment_reactions', 'notifications', 'user_library']) {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('user_id', fakeIds);
      if (error && !error.message.includes('does not exist')) {
        console.error(`   ${table}: ERROR ${error.message}`);
      } else {
        console.log(`   ${table}: cleaned`);
      }
    }

    // Delete fake users themselves
    console.log('6. Deleting fake users...');
    const { error: e6 } = await supabase
      .from('users')
      .delete()
      .in('id', fakeIds);
    if (e6) console.error('   ERROR:', e6.message);
    else console.log(`   Deleted ${fakeIds.length} fake users.`);
  }

  // Step 7: Reset game cached_stats and performance_tier
  console.log('7. Resetting game cached_stats and performance_tier...');
  // Supabase doesn't allow bulk update without filter, so we update where not null
  const { error: e7a } = await supabase
    .from('games')
    .update({ performance_tier: null, cached_stats: {} })
    .not('performance_tier', 'is', null);
  if (e7a) console.error('   performance_tier reset ERROR:', e7a.message);

  const { error: e7b } = await supabase
    .from('games')
    .update({ cached_stats: {} })
    .neq('cached_stats', '{}');
  if (e7b) console.error('   cached_stats reset ERROR:', e7b.message);
  console.log('   Done.');

  // Verify
  console.log('\n=== Verification ===');
  const tables = ['performance_reports', 'report_votes', 'consensus_ratings', 'users'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }

  console.log('\nPhase 1 complete!');
}

main().catch((err) => {
  console.error('Clean failed:', err);
  process.exit(1);
});
