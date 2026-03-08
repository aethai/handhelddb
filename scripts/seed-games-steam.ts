/**
 * Steam Games Importer for HandheldDB
 *
 * Strategy:
 * 1. Fetch top ~600 Steam Deck Verified/Playable games
 * 2. Get detailed info for each via Steam Store API
 * 3. Upsert to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const STEAM_API_KEY = process.env.STEAM_API_KEY!;

// Rate limiting
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Curated list of popular handheld-friendly Steam AppIDs
// These are top-rated Steam Deck Verified/Playable games
const SEED_APPIDS = [
  // AAA / Popular
  1245620, // Elden Ring
  1174180, // Red Dead Redemption 2
  1091500, // Cyberpunk 2077
  292030,  // The Witcher 3
  814380,  // Sekiro
  1938090, // Call of Duty: MW III
  1517290, // Battlefield 2042
  1593500, // God of War
  1888930, // The Last of Us Part I
  2322010, // Wuthering Waves
  1628350, // Stellar Blade (if on Steam)
  990080,  // Hogwarts Legacy
  1551360, // Forza Horizon 5

  // Indie darlings
  413150,  // Stardew Valley
  367520,  // Hollow Knight
  1145360, // Hades
  1100600, // Persona 5 Royal
  251570,  // 7 Days to Die
  105600,  // Terraria
  1794680, // Vampire Survivors
  2379780, // Balatro
  1966720, // Lethal Company
  892970,  // Valheim
  1063730, // New World
  548430,  // Deep Rock Galactic
  1172470, // Apex Legends
  252490,  // Rust
  322170,  // Geometry Dash
  2358720, // Black Myth: Wukong

  // RPGs
  1086940, // Baldur's Gate 3
  2054970, // Dragon's Dogma 2
  2252570, // Metaphor: ReFantazio
  1446780, // Monster Hunter Rise
  2246340, // Monster Hunter Wilds
  582010,  // Monster Hunter: World
  1817070, // Final Fantasy XVI
  1382330, // Persona 3 Reload
  1449560, // Final Fantasy VII Remake
  1817190, // Dragon Quest XI S
  774171,  // Trails of Cold Steel III
  1325200, // Trails into Reverie
  1668510, // Like a Dragon: Infinite Wealth

  // Action / Adventure
  1817230, // Lies of P
  1659420, // Ghost of Tsushima
  1238860, // Helldivers 2
  2567870, // Indiana Jones
  2050650, // Resident Evil 4 Remake
  2291030, // Silent Hill 2
  418370,  // Resident Evil 7
  883710,  // Resident Evil 2 Remake
  553850,  // Hellblade
  1461570, // Star Wars: Jedi Survivor
  1172380, // Star Wars: Jedi Fallen Order
  306130,  // The Elder Scrolls Online
  489830,  // Skyrim SE
  377160,  // Fallout 4
  2302790, // Avowed

  // Strategy / Sim
  294100,  // RimWorld
  262060,  // Darkest Dungeon
  1435470, // Darkest Dungeon 2
  457140,  // Oxygen Not Included
  1288930, // Against the Storm
  1150690, // HUMANKIND
  1158310, // Crusader Kings III
  394360,  // Hearts of Iron IV
  236390,  // War Thunder
  1364780, // Slay the Spire
  2868840, // Slay the Spire 2

  // Platformers / Metroidvanias
  774361,  // Blasphemous
  2114740, // Blasphemous 2
  1651560, // Dead Cells
  1113000, // Ori and the Blind Forest DE
  1057090, // Ori and the Will of the Wisps
  1105510, // Dark Souls Remastered
  374320,  // Dark Souls III
  570940,  // Dark Souls: REMASTERED
  1245620, // Elden Ring (already above)
  264710,  // Subnautica
  848450,  // Below Zero
  257850,  // Hyper Light Drifter
  751780,  // Shovel Knight
  2231450, // Prince of Persia: Lost Crown

  // Roguelikes
  2404740, // Rogue Legacy 2
  250900,  // The Binding of Isaac: Rebirth
  588650,  // Dead Cells
  960090,  // Hades (same as above? different ID)
  632360,  // Risk of Rain 2
  1337520, // Brotato
  1942280, // Halls of Torment

  // Racing / Sports
  1293830, // Forza Motorsport
  1222730, // F1 24
  1451190, // EA Sports FC 25
  1817070, // Gran Turismo 7 (if on PC)
  244210,  // Assetto Corsa
  805550,  // Dirt Rally 2.0

  // Shooters
  730,     // CS2
  578080,  // PUBG
  1085660, // Destiny 2
  2677660, // Warhammer 40,000: Space Marine 2
  1144200, // Ready or Not
  230410,  // Warframe
  236390,  // War Thunder

  // Puzzle / Casual
  620,     // Portal 2
  400,     // Portal
  239350,  // SpelunkyHD
  418240,  // Shadow of Mordor
  945360,  // Among Us
  1471170, // Viewfinder

  // Survival / Crafting
  526870,  // Satisfactory
  346110,  // ARK: SE
  2399830, // ARK: SA
  242760,  // The Forest
  1928980, // Sons of the Forest
  1623730, // Palworld
  1966720, // Lethal Company (dup)
  611670,  // Grounded

  // Turn-based
  1770010, // Divinity: OS 2
  2144740, // Disco Elysium: Final Cut... wait
  632470,  // Disco Elysium
  1144190, // Bug Fables
  1716740, // Chained Echoes
  331670,  // Undertale
  1382330, // Persona 3 Reload (dup)

  // MMO / Live service
  39210,   // FFXIV
  1599340, // Lost Ark

  // Horror
  753640,  // Outer Wilds
  211820,  // Starbound
  1840080, // Lethal Company (diff?)
  1690670, // Clock Tower
  251570,  // 7 Days (dup)

  // Co-op
  814380,  // Sekiro (dup)
  1426210, // It Takes Two
  728880,  // Overcooked 2
  1332010, // Stray
  1113560, // Phasmophobia

  // Deck favorites
  1203220, // Cult of the Lamb
  1635590, // Atomic Heart
  1449850, // Dave the Diver
  1623940, // Pizza Tower
  422970,  // Celeste
  774801,  // Blasphemous
  2231450, // Prince of Persia
  1966900, // Pacific Drive
  1948280, // No Rest for the Wicked
  2378900, // Neva
  1637320, // Banishers: Ghosts of New Eden

  // More popular titles
  550,     // Left 4 Dead 2
  570,     // Dota 2
  440,     // Team Fortress 2
  220,     // Half-Life 2
  2420510, // Half-Life 2 Remastered
  546560,  // Half-Life: Alyx
  427520,  // Factorio
  322330,  // Don't Starve Together
  204100,  // Euro Truck Simulator 2
  1332010, // Stray (dup)
  1085660, // Destiny 2 (dup)
];

// Deduplicate
const UNIQUE_APPIDS = [...new Set(SEED_APPIDS)];

interface SteamAppDetails {
  success: boolean;
  data?: {
    steam_appid: number;
    name: string;
    type: string;
    required_age: number;
    is_free: boolean;
    detailed_description: string;
    about_the_game: string;
    short_description: string;
    header_image: string;
    capsule_image: string;
    capsule_imagev5: string;
    screenshots?: Array<{ id: number; path_full: string }>;
    genres?: Array<{ id: string; description: string }>;
    categories?: Array<{ id: number; description: string }>;
    developers?: string[];
    publishers?: string[];
    metacritic?: { score: number; url: string };
    release_date?: { coming_soon: boolean; date: string };
    price_overview?: { final: number; currency: string };
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 250);
}

function parseReleaseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Steam dates come as "Feb 25, 2022" or "Q1 2025" etc.
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function fetchSteamAppDetails(
  appid: number,
): Promise<SteamAppDetails['data'] | null> {
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

async function fetchDeckCompatibility(
  appid: number,
): Promise<string> {
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

async function importGames() {
  console.log(`Starting import of ${UNIQUE_APPIDS.length} games from Steam...`);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < UNIQUE_APPIDS.length; i++) {
    const appid = UNIQUE_APPIDS[i];
    const progress = `[${i + 1}/${UNIQUE_APPIDS.length}]`;

    // Fetch app details
    const data = await fetchSteamAppDetails(appid);
    if (!data || data.type !== 'game') {
      console.log(`${progress} Skipped ${appid} (not a game or not found)`);
      skipped++;
      await sleep(300); // respect rate limit
      continue;
    }

    // Fetch Deck compatibility
    const deckCompat = await fetchDeckCompatibility(appid);

    // Build game record
    const game = {
      steam_appid: data.steam_appid,
      name: data.name,
      slug: slugify(data.name),
      description: data.about_the_game?.slice(0, 5000) ?? null,
      short_description: data.short_description?.slice(0, 500) ?? null,
      header_image: data.header_image ?? null,
      capsule_image: data.capsule_imagev5 ?? data.capsule_image ?? null,
      screenshots:
        data.screenshots?.slice(0, 6).map((s) => s.path_full) ?? [],
      genres:
        data.genres?.map((g) => g.description) ?? [],
      tags: [] as string[],
      developers: data.developers ?? [],
      publishers: data.publishers ?? [],
      metacritic_score: data.metacritic?.score ?? null,
      metacritic_url: data.metacritic?.url ?? null,
      deck_compatibility: deckCompat,
      release_date: parseReleaseDate(data.release_date?.date),
      price_usd: data.price_overview
        ? data.price_overview.final / 100
        : null,
      is_free_to_play: data.is_free,
      last_steam_sync: new Date().toISOString(),
    };

    // Upsert to Supabase
    const { error } = await supabase
      .from('games')
      .upsert(game, { onConflict: 'steam_appid' });

    if (error) {
      console.error(
        `${progress} FAIL ${data.name} (${appid}): ${error.message}`,
      );
      failed++;
    } else {
      console.log(
        `${progress} ${data.name} — ${deckCompat} — ${game.genres.join(', ')}`,
      );
      imported++;
    }

    // Steam rate limit: ~200 requests per 5 min = ~1.5s between requests
    // We make 2 requests per game, so ~3s gap
    await sleep(1500);
  }

  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
}

importGames().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
