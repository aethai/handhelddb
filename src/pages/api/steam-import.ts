import type { APIRoute } from 'astro';
import { getUser } from '@lib/auth/supabase';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

const STEAM_API_KEY = import.meta.env.STEAM_API_KEY ?? process.env.STEAM_API_KEY;

interface SteamGame {
  appid: number;
  playtime_forever: number; // minutes
  name?: string;
}

interface OwnedGamesResponse {
  response: {
    game_count?: number;
    games?: SteamGame[];
  };
}

interface VanityURLResponse {
  response: {
    success: number; // 1 = success, 42 = no match
    steamid?: string;
    message?: string;
  };
}

/**
 * Resolve a Steam vanity URL name to a 64-bit Steam ID.
 * Returns null if the vanity name doesn't resolve.
 */
async function resolveVanityURL(vanityName: string): Promise<string | null> {
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityName)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data: VanityURLResponse = await res.json();
  if (data.response.success === 1 && data.response.steamid) {
    return data.response.steamid;
  }
  return null;
}

/**
 * Fetch the list of owned games for a Steam user.
 * Returns null if the profile is private or the request fails.
 */
async function fetchOwnedGames(steamId: string): Promise<SteamGame[] | null> {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data: OwnedGamesResponse = await res.json();

  // Empty response object means private profile
  if (!data.response || !data.response.games) {
    return null;
  }

  return data.response.games;
}

/**
 * Parse a Steam input string to extract the Steam ID or vanity name.
 * Supports:
 *  - Raw 64-bit Steam ID (17-digit number)
 *  - steamcommunity.com/profiles/XXXXX
 *  - steamcommunity.com/id/vanityname
 *  - Just a vanity name string
 */
function parseSteamInput(input: string): { type: 'id'; value: string } | { type: 'vanity'; value: string } {
  const trimmed = input.trim();

  // Check for profile URL with numeric ID
  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d+)/);
  if (profileMatch) {
    return { type: 'id', value: profileMatch[1] };
  }

  // Check for vanity URL
  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/\s]+)/);
  if (vanityMatch) {
    return { type: 'vanity', value: vanityMatch[1] };
  }

  // Check if it's a raw 64-bit Steam ID (17 digits)
  if (/^\d{17}$/.test(trimmed)) {
    return { type: 'id', value: trimmed };
  }

  // Treat as vanity name
  return { type: 'vanity', value: trimmed };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit: 5 imports per IP per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`steam-import:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // Require authentication
  const user = await getUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!STEAM_API_KEY) {
    console.error('STEAM_API_KEY is not configured');
    return new Response(JSON.stringify({ error: 'Steam integration is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
  let body: { steamId: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.steamId || typeof body.steamId !== 'string' || !body.steamId.trim()) {
    return new Response(JSON.stringify({ error: 'steamId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Step A: Resolve the Steam ID
  const parsed = parseSteamInput(body.steamId);
  let steamId64: string;

  if (parsed.type === 'vanity') {
    const resolved = await resolveVanityURL(parsed.value);
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: `Could not find Steam user "${parsed.value}". Check the profile name or use a 64-bit Steam ID.` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
    steamId64 = resolved;
  } else {
    steamId64 = parsed.value;
  }

  // Step B: Fetch owned games
  const ownedGames = await fetchOwnedGames(steamId64);
  if (ownedGames === null) {
    return new Response(
      JSON.stringify({
        error: 'Could not fetch Steam library. The profile may be private. Set your game details to public in Steam privacy settings.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (ownedGames.length === 0) {
    return new Response(
      JSON.stringify({ imported: 0, matched: 0, totalOwned: 0, games: [] }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Step C: Match Steam AppIDs against our games table
  const steamAppIds = ownedGames.map((g) => g.appid);

  // Query in batches of 500 to avoid overly large IN clauses
  const BATCH_SIZE = 500;
  const matchedGames: Array<{ id: string; steam_appid: number; name: string; slug: string; header_image: string | null }> = [];

  for (let i = 0; i < steamAppIds.length; i += BATCH_SIZE) {
    const batch = steamAppIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('id, steam_appid, name, slug, header_image')
      .in('steam_appid', batch);

    if (error) {
      console.error('Error querying games table:', error);
      continue;
    }

    if (data) {
      matchedGames.push(...data);
    }
  }

  // Build a map of steam_appid -> playtime from the owned games
  const playtimeMap = new Map<number, number>();
  for (const game of ownedGames) {
    playtimeMap.set(game.appid, game.playtime_forever);
  }

  // Step D: Upsert into user_library
  let importedCount = 0;

  if (matchedGames.length > 0) {
    const upsertRows = matchedGames.map((game) => ({
      user_id: user.id,
      game_id: game.id,
      playtime_minutes: playtimeMap.get(game.steam_appid!) ?? 0,
      imported_at: new Date().toISOString(),
    }));

    // Upsert in batches
    for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
      const batch = upsertRows.slice(i, i + BATCH_SIZE);
      const { error, count } = await supabaseAdmin
        .from('user_library')
        .upsert(batch, {
          onConflict: 'user_id,game_id',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error('Error upserting user_library batch:', error);
      } else {
        importedCount += count ?? batch.length;
      }
    }
  }

  // Step E: Return results
  const matchedGamesList = matchedGames.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    headerImage: g.header_image,
    playtimeMinutes: playtimeMap.get(g.steam_appid!) ?? 0,
  }));

  // Sort by playtime descending
  matchedGamesList.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

  return new Response(
    JSON.stringify({
      imported: importedCount,
      matched: matchedGames.length,
      totalOwned: ownedGames.length,
      games: matchedGamesList,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
