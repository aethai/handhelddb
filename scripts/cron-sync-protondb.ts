/**
 * Cron: Sync ProtonDB compatibility tiers
 *
 * Fetches ProtonDB tier for games that have a steam_appid and haven't been
 * checked in the last 14 days. Updates protondb_tier and last_protondb_sync.
 *
 * Rate limit: 500ms between requests, max 200 games per run.
 * Schedule: weekly on Sunday at 4am UTC
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_GAMES_PER_RUN = 200;
const DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fourteenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

interface ProtonDBSummary {
  tier: string;
  score: number;
  confidence: string;
  total: number;
  trendingTier?: string;
  bestReportedTier?: string;
}

const TIER_MAP: Record<string, string> = {
  platinum: 'platinum',
  gold: 'gold',
  silver: 'silver',
  bronze: 'bronze',
  borked: 'borked',
};

async function fetchProtonDB(appid: number): Promise<ProtonDBSummary | null> {
  try {
    const res = await fetch(
      `https://www.protondb.com/api/v1/reports/summaries/${appid}.json`,
      {
        headers: {
          'User-Agent': 'HandheldGameDB/1.0 (performance database, cron sync)',
        },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ProtonDB sync starting...`);

  const cutoff = fourteenDaysAgo();

  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, steam_appid, last_protondb_sync')
    .not('steam_appid', 'is', null)
    .or(`last_protondb_sync.is.null,last_protondb_sync.lt.${cutoff}`)
    .order('last_protondb_sync', { ascending: true, nullsFirst: true })
    .limit(MAX_GAMES_PER_RUN);

  if (error) {
    console.error('Failed to fetch games:', error.message);
    process.exit(1);
  }

  console.log(`Found ${games.length} games needing ProtonDB sync (max ${MAX_GAMES_PER_RUN})\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const progress = `[${i + 1}/${games.length}]`;

    if (!game.steam_appid) {
      skipped++;
      continue;
    }

    try {
      const summary = await fetchProtonDB(game.steam_appid);

      if (!summary || !summary.tier) {
        console.log(`${progress} SKIP  ${game.name} (${game.steam_appid}) — no ProtonDB data`);
        // Still update last_protondb_sync so we don't keep re-checking
        await supabase
          .from('games')
          .update({
            last_protondb_sync: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', game.id);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const mappedTier = TIER_MAP[summary.tier.toLowerCase()] ?? 'pending';

      const { error: updateError } = await supabase
        .from('games')
        .update({
          protondb_tier: mappedTier,
          last_protondb_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`${progress} FAIL  ${game.name} — ${updateError.message}`);
        failed++;
      } else {
        console.log(
          `${progress} OK    ${game.name} -> ${summary.tier} (${summary.total} reports, confidence: ${summary.confidence})`,
        );
        updated++;
      }

      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`${progress} FAIL  ${game.name} — ${(e as Error).message}`);
      failed++;
      await sleep(DELAY_MS * 2);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nProtonDB sync complete in ${elapsed}s`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
}

main().catch((err) => {
  console.error('ProtonDB sync failed:', err);
  process.exit(1);
});
