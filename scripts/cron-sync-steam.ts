/**
 * Cron: Sync existing games with Steam Store API
 *
 * Fetches updated info for games that have a steam_appid and haven't been
 * synced in the last 7 days. Updates metacritic_score, steam_review_score,
 * price_usd, is_free_to_play, and last_steam_sync.
 *
 * Rate limit: 1.5s between requests, max 100 games per run.
 * Schedule: daily at 3am UTC
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_GAMES_PER_RUN = 100;
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

interface SteamAppResponse {
  [appid: string]: {
    success: boolean;
    data?: {
      steam_appid: number;
      name: string;
      is_free: boolean;
      metacritic?: { score: number; url: string };
      price_overview?: { final: number; currency: string };
    };
  };
}

async function fetchSteamDetails(appid: number): Promise<SteamAppResponse[string]['data'] | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
    );
    if (!res.ok) return null;
    const json: SteamAppResponse = await res.json();
    const entry = json[String(appid)];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function fetchSteamReviews(appid: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const summary = json?.query_summary;
    if (!summary || summary.total_reviews === 0) return null;
    // Steam review score as percentage (0-100)
    return Math.round((summary.total_positive / summary.total_reviews) * 100);
  } catch {
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Steam sync starting...`);

  // Fetch games needing sync: have steam_appid, last_steam_sync is null or older than 7 days
  const cutoff = sevenDaysAgo();

  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, steam_appid, last_steam_sync')
    .not('steam_appid', 'is', null)
    .or(`last_steam_sync.is.null,last_steam_sync.lt.${cutoff}`)
    .order('last_steam_sync', { ascending: true, nullsFirst: true })
    .limit(MAX_GAMES_PER_RUN);

  if (error) {
    console.error('Failed to fetch games:', error.message);
    process.exit(1);
  }

  console.log(`Found ${games.length} games needing Steam sync (max ${MAX_GAMES_PER_RUN})\n`);

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
      // Fetch app details from Steam
      const details = await fetchSteamDetails(game.steam_appid);

      if (!details) {
        console.log(`${progress} SKIP  ${game.name} (${game.steam_appid}) — no Steam data`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // Fetch review score (separate endpoint)
      const reviewScore = await fetchSteamReviews(game.steam_appid);

      // Build update payload
      const updateData: Record<string, unknown> = {
        last_steam_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (details.metacritic?.score != null) {
        updateData.metacritic_score = details.metacritic.score;
      }

      if (reviewScore != null) {
        updateData.steam_review_score = reviewScore;
      }

      if (details.price_overview) {
        updateData.price_usd = details.price_overview.final / 100;
      }

      updateData.is_free_to_play = details.is_free;

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', game.id);

      if (updateError) {
        console.log(`${progress} FAIL  ${game.name} — ${updateError.message}`);
        failed++;
      } else {
        const meta = details.metacritic?.score ?? '-';
        const review = reviewScore ?? '-';
        const price = details.price_overview
          ? `$${(details.price_overview.final / 100).toFixed(2)}`
          : details.is_free ? 'F2P' : '-';
        console.log(`${progress} OK    ${game.name} — metacritic: ${meta}, reviews: ${review}%, price: ${price}`);
        updated++;
      }

      // Respect Steam rate limits (1.5s between games, we make 2 requests per game)
      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`${progress} FAIL  ${game.name} — ${(e as Error).message}`);
      failed++;
      await sleep(DELAY_MS * 2);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSteam sync complete in ${elapsed}s`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
}

main().catch((err) => {
  console.error('Steam sync failed:', err);
  process.exit(1);
});
