/**
 * Enriches games with ProtonDB compatibility tiers.
 * ProtonDB provides free API access by Steam AppID.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

interface ProtonDBSummary {
  tier: string;
  score: number;
  confidence: string;
  total: number;
  trendingTier?: string;
  bestReportedTier?: string;
}

async function getProtonDB(appId: number): Promise<ProtonDBSummary | null> {
  try {
    const res = await fetch(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`, {
      headers: {
        'User-Agent': 'HandheldGameDB/1.0 (performance database)',
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  // Get all games with steam_appid but no protondb_tier (or 'pending')
  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, steam_appid, protondb_tier')
    .not('steam_appid', 'is', null)
    .or('protondb_tier.is.null,protondb_tier.eq.pending')
    .order('name');

  if (error) {
    console.error('Failed to fetch games:', error);
    process.exit(1);
  }

  console.log(`Found ${games.length} games to check on ProtonDB\n`);

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const game of games) {
    if (!game.steam_appid) {
      skipped++;
      continue;
    }

    try {
      const summary = await getProtonDB(game.steam_appid);

      if (!summary || !summary.tier) {
        console.log(`  SKIP  ${game.name} (${game.steam_appid}) — no ProtonDB data`);
        skipped++;
        await delay(500);
        continue;
      }

      // Map ProtonDB tier to our enum
      const tierMap: Record<string, string> = {
        platinum: 'platinum',
        gold: 'gold',
        silver: 'silver',
        bronze: 'bronze',
        borked: 'borked',
      };

      const mappedTier = tierMap[summary.tier.toLowerCase()] ?? 'pending';

      const { error: updateError } = await supabase
        .from('games')
        .update({
          protondb_tier: mappedTier,
          last_protondb_sync: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`  FAIL  ${game.name} — ${updateError.message}`);
        failed++;
      } else {
        console.log(`  OK    ${game.name} → ${summary.tier} (${summary.total} reports, confidence: ${summary.confidence})`);
        enriched++;
      }

      await delay(500);
    } catch (e) {
      console.log(`  FAIL  ${game.name} — ${(e as Error).message}`);
      failed++;
      await delay(1000);
    }
  }

  console.log(`\nDone: ${enriched} enriched, ${skipped} skipped, ${failed} failed`);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

main();
