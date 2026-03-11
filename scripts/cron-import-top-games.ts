/**
 * Cron: Import top Steam games by player count.
 *
 * Fetches SteamSpy top 3 pages (300 games sorted by players),
 * skips games already in DB, applies quality gate (100+ reviews OR Metacritic),
 * fetches Steam details + Deck compat + review score, and inserts.
 *
 * Max 50 new games per run to avoid hammering Steam.
 * Rate limit: 1.5s between Steam API calls.
 *
 * Schedule: daily at 6:00 AM UTC
 * Usage: npx tsx scripts/cron-import-top-games.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_NEW_PER_RUN = 50;
const STEAMSPY_PAGES = 3;
const DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 250);
}

function parseReleaseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

interface SteamSpyGame {
  appid: number;
  name: string;
  owners: string;
  ccu: number;
}

async function fetchSteamSpyPage(page: number): Promise<SteamSpyGame[]> {
  try {
    const res = await fetch(
      `https://steamspy.com/api.php?request=all&page=${page}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Object.values(json) as SteamSpyGame[];
  } catch {
    return [];
  }
}

async function fetchSteamAppDetails(appid: number) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const entry = json[String(appid)];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function fetchSteamReviews(appid: number): Promise<{ score: number; count: number } | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const summary = json?.query_summary;
    if (!summary || summary.total_reviews === 0) return null;
    return {
      score: Math.round((summary.total_positive / summary.total_reviews) * 100),
      count: summary.total_reviews,
    };
  } catch {
    return null;
  }
}

async function fetchDeckCompatibility(appid: number): Promise<string> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${appid}`,
    );
    if (!res.ok) return 'unknown';
    const json = await res.json();
    const cat = json?.results?.resolved_category;
    if (cat === 3) return 'verified';
    if (cat === 2) return 'playable';
    if (cat === 1) return 'unsupported';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Top games import starting...`);

  // Get existing AppIDs
  const { data: existing } = await supabase
    .from('games')
    .select('steam_appid');
  const existingAppIds = new Set(
    (existing ?? []).map((g) => g.steam_appid).filter(Boolean),
  );
  console.log(`Already have ${existingAppIds.size} games in DB\n`);

  // Fetch top games from SteamSpy
  const candidateAppIds: number[] = [];
  for (let page = 0; page < STEAMSPY_PAGES; page++) {
    console.log(`Fetching SteamSpy page ${page}...`);
    const games = await fetchSteamSpyPage(page);
    const newIds = games
      .filter((g) => !existingAppIds.has(g.appid))
      .map((g) => g.appid);
    candidateAppIds.push(...newIds);
    console.log(`  Got ${games.length} games, ${newIds.length} new`);
    await sleep(DELAY_MS);
  }

  console.log(`\nNew candidates: ${candidateAppIds.length} (max ${MAX_NEW_PER_RUN} will be imported)\n`);

  let imported = 0;
  let skipped = 0;
  let rejected = 0;
  let failed = 0;

  for (let i = 0; i < candidateAppIds.length && imported < MAX_NEW_PER_RUN; i++) {
    const appid = candidateAppIds[i];
    const progress = `[${i + 1}/${candidateAppIds.length}]`;

    // Fetch Steam details
    const data = await fetchSteamAppDetails(appid);
    await sleep(DELAY_MS);

    if (!data || data.type !== 'game') {
      skipped++;
      continue;
    }

    // Fetch review score
    const reviews = await fetchSteamReviews(appid);
    await sleep(500);

    // Quality gate: 100+ reviews OR Metacritic score
    const hasMetacritic = data.metacritic?.score != null;
    const hasEnoughReviews = reviews != null && reviews.count >= 100;

    if (!hasMetacritic && !hasEnoughReviews) {
      rejected++;
      console.log(`${progress} REJECT ${data.name} — MC: ${data.metacritic?.score ?? 'none'}, reviews: ${reviews?.count ?? 0}`);
      continue;
    }

    // Fetch Deck compatibility
    const deckCompat = await fetchDeckCompatibility(appid);
    await sleep(500);

    const game = {
      steam_appid: data.steam_appid,
      name: data.name,
      slug: slugify(data.name),
      description: data.about_the_game?.slice(0, 5000) ?? null,
      short_description: data.short_description?.slice(0, 500) ?? null,
      header_image: data.header_image ?? null,
      capsule_image: data.capsule_imagev5 ?? data.capsule_image ?? null,
      screenshots: data.screenshots?.slice(0, 6).map((s: any) => s.path_full) ?? [],
      genres: data.genres?.map((g: any) => g.description) ?? [],
      tags: [],
      developers: data.developers ?? [],
      publishers: data.publishers ?? [],
      metacritic_score: data.metacritic?.score ?? null,
      metacritic_url: data.metacritic?.url ?? null,
      steam_review_score: reviews?.score ?? null,
      steam_review_count: reviews?.count ?? null,
      deck_compatibility: deckCompat,
      release_date: parseReleaseDate(data.release_date?.date),
      price_usd: data.price_overview ? data.price_overview.final / 100 : null,
      is_free_to_play: data.is_free,
      last_steam_sync: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('games')
      .upsert(game, { onConflict: 'steam_appid' });

    if (error) {
      if (error.message.includes('games_slug_key')) {
        game.slug = `${game.slug}-${appid}`;
        const { error: retryErr } = await supabase
          .from('games')
          .upsert(game, { onConflict: 'steam_appid' });
        if (retryErr) {
          console.error(`${progress} FAIL ${data.name}: ${retryErr.message}`);
          failed++;
        } else {
          console.log(`${progress} OK ${data.name} — MC:${game.metacritic_score ?? '-'} Reviews:${reviews?.score ?? '-'}% Deck:${deckCompat}`);
          imported++;
        }
      } else {
        console.error(`${progress} FAIL ${data.name}: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`${progress} OK ${data.name} — MC:${game.metacritic_score ?? '-'} Reviews:${reviews?.score ?? '-'}% Deck:${deckCompat}`);
      imported++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTop games import complete in ${elapsed}s`);
  console.log(`  Imported:  ${imported}`);
  console.log(`  Skipped:   ${skipped} (not a game)`);
  console.log(`  Rejected:  ${rejected} (quality gate)`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total DB:  ${existingAppIds.size + imported}`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
