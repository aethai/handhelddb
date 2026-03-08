/**
 * Import top Steam games by player count/popularity.
 * Fetches from SteamSpy API (top 100 per page) and imports game details.
 * Run: cd /home/ubuntu/handhelddb && npx tsx scripts/import-top-steam-games.ts
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

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
  // First, get existing AppIDs so we skip them
  const { data: existing } = await supabase
    .from('games')
    .select('steam_appid');
  const existingAppIds = new Set((existing ?? []).map(g => g.steam_appid).filter(Boolean));
  console.log(`Already have ${existingAppIds.size} games in DB\n`);

  // Fetch top games from SteamSpy (pages 0-9 = ~1000 games)
  const allAppIds: number[] = [];
  for (let page = 0; page < 10; page++) {
    console.log(`Fetching SteamSpy page ${page}...`);
    const games = await fetchSteamSpyPage(page);
    const newIds = games
      .filter(g => !existingAppIds.has(g.appid))
      .map(g => g.appid);
    allAppIds.push(...newIds);
    console.log(`  Got ${games.length} games, ${newIds.length} new`);
    await sleep(1500); // SteamSpy rate limit
  }

  console.log(`\nTotal new games to import: ${allAppIds.length}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < allAppIds.length; i++) {
    const appid = allAppIds[i];
    const progress = `[${i + 1}/${allAppIds.length}]`;

    const data = await fetchSteamAppDetails(appid);
    if (!data || data.type !== 'game') {
      skipped++;
      await sleep(300);
      continue;
    }

    const deckCompat = await fetchDeckCompatibility(appid);

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
      steam_review_score: null as number | null,
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
      // Slug conflict — try with appid suffix
      if (error.message.includes('games_slug_key')) {
        game.slug = `${game.slug}-${appid}`;
        const { error: retryErr } = await supabase
          .from('games')
          .upsert(game, { onConflict: 'steam_appid' });
        if (retryErr) {
          console.error(`${progress} FAIL ${data.name}: ${retryErr.message}`);
          failed++;
        } else {
          console.log(`${progress} ${data.name} (slug fixed) — ${deckCompat}`);
          imported++;
        }
      } else {
        console.error(`${progress} FAIL ${data.name}: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`${progress} ${data.name} — ${deckCompat} — ${game.genres.join(', ')}`);
      imported++;
    }

    // Rate limit: 2 requests per game, ~1.5s gap
    await sleep(1500);
  }

  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total in DB: ${existingAppIds.size + imported}`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
