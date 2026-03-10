/**
 * Cron: Enrich top games with ProtonDB details, SteamSpy stats, and Deck compat data.
 *
 * Collects data needed for AI-estimated performance reports:
 * - ProtonDB: report count, confidence, score, trending tier
 * - SteamSpy: owners, concurrent players, avg playtime
 * - Steam Deck: detailed compatibility test items
 *
 * Stores everything in games.cached_stats JSONB.
 *
 * Rate limits: 500ms ProtonDB, 300ms SteamSpy, 200ms Deck API
 * Schedule: daily at 5:00 AM UTC
 * Max per run: 300 games
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_GAMES_PER_RUN = 300;
const PROTONDB_DELAY = 500;
const STEAMSPY_DELAY = 300;
const DECK_API_DELAY = 200;
const ENRICHMENT_FRESHNESS_DAYS = 7;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const UA = 'HandheldGameDB/1.0 (performance database, enrichment cron)';

// ── ProtonDB ──
interface ProtonDBSummary {
  tier: string;
  score: number;
  confidence: string;
  total: number;
  trendingTier?: string;
  bestReportedTier?: string;
}

async function fetchProtonDB(appid: number): Promise<ProtonDBSummary | null> {
  try {
    const res = await fetch(
      `https://www.protondb.com/api/v1/reports/summaries/${appid}.json`,
      { headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── SteamSpy ──
interface SteamSpyData {
  owners: string;
  ccu: number;
  average_forever: number;
  median_forever: number;
  average_2weeks: number;
  positive: number;
  negative: number;
}

async function fetchSteamSpy(appid: number): Promise<SteamSpyData | null> {
  try {
    const res = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appid}`,
      { headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Steam Deck Compatibility ──
interface DeckCompatItem {
  display_type: number;
  loc_token: string;
}

interface DeckCompatResult {
  appid: number;
  resolved_category: number; // 0=Unknown, 1=Unsupported, 2=Playable, 3=Verified
  resolved_items: DeckCompatItem[];
}

async function fetchDeckCompat(appid: number): Promise<DeckCompatResult | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${appid}`,
      { headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success !== 1) return null;
    return data.results;
  } catch {
    return null;
  }
}

// ── Prioritization scoring ──
function priorityScore(game: {
  deck_compatibility: string | null;
  protondb_tier: string | null;
  metacritic_score: number | null;
}): number {
  let score = 0;
  if (game.deck_compatibility === 'verified' || game.deck_compatibility === 'playable') score += 50;
  if (game.protondb_tier === 'platinum' || game.protondb_tier === 'gold') score += 30;
  score += (game.metacritic_score ?? 0) / 10; // 0-10 range
  return score;
}

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Game enrichment starting...`);

  // Calculate freshness cutoff
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ENRICHMENT_FRESHNESS_DAYS);

  // Fetch candidate games: have steam_appid, not recently enriched
  const { data: allGames, error } = await supabase
    .from('games')
    .select('id, name, slug, steam_appid, deck_compatibility, protondb_tier, metacritic_score, cached_stats')
    .not('steam_appid', 'is', null)
    .order('metacritic_score', { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) {
    console.error('Failed to fetch games:', error.message);
    process.exit(1);
  }

  // Filter out recently enriched games
  const candidates = allGames.filter((g) => {
    const stats = g.cached_stats as Record<string, unknown> | null;
    if (!stats?.enriched_at) return true;
    const enrichedAt = new Date(stats.enriched_at as string);
    return enrichedAt < cutoff;
  });

  // Sort by priority and take top N
  const sorted = candidates
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, MAX_GAMES_PER_RUN);

  console.log(`Found ${allGames.length} total games, ${candidates.length} need enrichment, processing top ${sorted.length}\n`);

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < sorted.length; i++) {
    const game = sorted[i];
    const progress = `[${i + 1}/${sorted.length}]`;
    const appid = game.steam_appid as number;

    try {
      // Fetch all three APIs
      const protondb = await fetchProtonDB(appid);
      await sleep(PROTONDB_DELAY);

      const steamspy = await fetchSteamSpy(appid);
      await sleep(STEAMSPY_DELAY);

      const deckCompat = await fetchDeckCompat(appid);
      await sleep(DECK_API_DELAY);

      // Build cached_stats object (merge with existing)
      const existing = (game.cached_stats as Record<string, unknown>) ?? {};
      const newStats = {
        ...existing,
        enriched_at: new Date().toISOString(),
        // ProtonDB
        protondb_reports_total: protondb?.total ?? null,
        protondb_confidence: protondb?.confidence ?? null,
        protondb_score: protondb?.score ?? null,
        protondb_trending_tier: protondb?.trendingTier ?? null,
        protondb_best_tier: protondb?.bestReportedTier ?? null,
        // SteamSpy
        steamspy_owners: steamspy?.owners ?? null,
        steamspy_ccu: steamspy?.ccu ?? null,
        steamspy_avg_playtime: steamspy?.average_forever ?? null,
        steamspy_median_playtime: steamspy?.median_forever ?? null,
        steamspy_positive: steamspy?.positive ?? null,
        steamspy_negative: steamspy?.negative ?? null,
        // Deck compat
        deck_resolved_category: deckCompat?.resolved_category ?? null,
        deck_test_items: deckCompat?.resolved_items ?? null,
      };

      const { error: updateError } = await supabase
        .from('games')
        .update({
          cached_stats: newStats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`${progress} FAIL  ${game.name} — ${updateError.message}`);
        failed++;
      } else {
        const sources = [
          protondb ? `ProtonDB(${protondb.total} reports)` : null,
          steamspy ? `SteamSpy(${steamspy.owners})` : null,
          deckCompat ? `Deck(cat=${deckCompat.resolved_category})` : null,
        ].filter(Boolean).join(', ');
        console.log(`${progress} OK    ${game.name} — ${sources}`);
        enriched++;
      }
    } catch (e) {
      console.log(`${progress} FAIL  ${game.name} — ${(e as Error).message}`);
      failed++;
      await sleep(1000);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nEnrichment complete in ${elapsed}s`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Failed:   ${failed}`);
}

main().catch((err) => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
