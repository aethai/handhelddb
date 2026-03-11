/**
 * One-time migration: Add 'trusted_benchmark' to quality_tier enum
 * Run: cd /home/ubuntu/handhelddb && npx tsx scripts/migrate-add-trusted-benchmark.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  // Test current enum values by checking existing data
  const { data: sample } = await supabase
    .from('performance_reports')
    .select('quality_tier')
    .eq('quality_tier', 'trusted_benchmark')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('trusted_benchmark already exists in enum. Done.');
    return;
  }

  // Since we can't ALTER TYPE via Supabase client directly,
  // we'll use the workaround: just use the text value.
  // Supabase PostgREST allows inserting values that match the enum.
  // The enum must be altered via SQL dashboard or migration.

  console.log('NOTE: The quality_tier enum needs to be updated via Supabase SQL Editor.');
  console.log('Run this SQL in the Supabase dashboard SQL Editor:');
  console.log('');
  console.log("  ALTER TYPE quality_tier ADD VALUE IF NOT EXISTS 'trusted_benchmark' BEFORE 'community_confirmed';");
  console.log('');
  console.log('Meanwhile, the code changes are in place and will work once the enum is updated.');
  console.log('As a workaround, trusted channel imports will use quality_tier=\'imported\' until then.');

  // Check how many existing YouTube imports we have from trusted channels
  const { data: existingImports, error } = await supabase
    .from('performance_reports')
    .select('id, notes, quality_tier')
    .eq('import_source', 'youtube')
    .limit(100);

  if (error) {
    console.error('Error querying:', error.message);
    return;
  }

  const trustedChannelNames = ['ETA PRIME', 'The Phawx', 'Fan The Deck', 'NerdNest', 'Bald Tech', 'Deck Wizard'];
  const trustedImports = (existingImports ?? []).filter(r =>
    trustedChannelNames.some(ch => r.notes?.includes(ch))
  );

  console.log(`\nExisting YouTube imports: ${existingImports?.length ?? 0}`);
  console.log(`From trusted channels: ${trustedImports.length}`);
  console.log('These will be upgraded to trusted_benchmark once enum is updated.');
}

main().catch(console.error);
