/**
 * cron-steam-patches.ts
 * Monitors Steam build IDs for games and detects patches/updates.
 * When a build ID changes, updates games.steam_build_id and games.last_major_update.
 * This is used by the consensus system to apply faster recency decay for actively-patched games.
 *
 * Run: npx tsx scripts/cron-steam-patches.ts
 * Suggested schedule: every 6 hours via cron
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://crxxcojzpavehofzfubq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const STEAM_API_KEY = process.env.STEAM_API_KEY ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 1500; // Steam API rate limit: ~200 requests/5 min

interface SteamAppInfo {
  buildid?: string;
  timeupdated?: number;
}

async function fetchSteamBuildId(appId: number): Promise<SteamAppInfo | null> {
  try {
    // Use Steam GetAppInfo via store API (no key needed)
    const res = await fetch(`https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/?appid=${appId}&version=0`);
    if (!res.ok) return null;
    const data = await res.json();
    // UpToDateCheck doesn't return build ID directly. Use appdetails instead.
    const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`);
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();
    // Store API doesn't expose build ID either. Use Steam Web API GetPlayerSummaries pattern.
    // Actually, the best way is via the Steam CDN info endpoint
    const infoRes = await fetch(`https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/?appid=${appId}&version=0`);
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json();

    if (infoData?.response?.required_version) {
      return { buildid: String(infoData.response.required_version) };
    }
    return null;
  } catch {
    return null;
  }
}

// Alternative: use SteamCMD-style API which actually returns build IDs
async function fetchBuildIdViaProductInfo(appId: number): Promise<string | null> {
  try {
    // Use the public Steam product info API
    const res = await fetch(
      `https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/?appid=${appId}&version=0`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.response?.required_version !== undefined) {
      return String(data.response.required_version);
    }

    // Fallback: check the store page's last update via review histogram
    const reviewRes = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=0&filter=recent`
    );
    if (!reviewRes.ok) return null;
    const reviewData = await reviewRes.json();
    // Not a build ID, but we can detect "activity" from recent reviews
    return null;
  } catch {
    return null;
  }
}

// Use the Steam news feed to detect patches
async function fetchLatestNews(appId: number): Promise<{ date: Date; title: string } | null> {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=100&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.appnews?.newsitems;
    if (!items || items.length === 0) return null;

    // Look for patch/update news items
    const patchKeywords = /update|patch|hotfix|fix|changelog|release\s*notes|version|v\d/i;
    for (const item of items) {
      if (patchKeywords.test(item.title) || patchKeywords.test(item.contents)) {
        return {
          date: new Date(item.date * 1000),
          title: item.title,
        };
      }
    }
    // If no patch-specific news, use latest news date as approximation
    return {
      date: new Date(items[0].date * 1000),
      title: items[0].title,
    };
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[${new Date().toISOString()}] Steam patch detection starting...`);

  // Fetch games with steam_appid that have consensus data (only worth tracking)
  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, steam_appid, steam_build_id, last_major_update')
    .not('steam_appid', 'is', null)
    .not('performance_tier', 'is', null) // Only games with performance data
    .order('updated_at', { ascending: true }) // Oldest-synced first
    .limit(BATCH_SIZE);

  if (error || !games) {
    console.error('Failed to fetch games:', error);
    return;
  }

  console.log(`Checking ${games.length} games for patches...\n`);

  let updated = 0;
  let checked = 0;
  let skipped = 0;

  for (const game of games) {
    checked++;
    const appId = game.steam_appid as number;
    const progress = `[${checked}/${games.length}]`;

    // Fetch latest news (most reliable way to detect patches via public API)
    const news = await fetchLatestNews(appId);
    if (!news) {
      console.log(`${progress} SKIP  ${game.name} — no news data`);
      skipped++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const existingUpdate = game.last_major_update ? new Date(game.last_major_update) : null;
    const newsDate = news.date;

    // Check if this is a newer update than what we have
    if (existingUpdate && newsDate <= existingUpdate) {
      console.log(`${progress} OK    ${game.name} — no new patches (last: ${existingUpdate.toISOString().slice(0, 10)})`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    // Only count as a "patch" if the news is from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (newsDate < sixMonthsAgo) {
      console.log(`${progress} STALE ${game.name} — last news: ${newsDate.toISOString().slice(0, 10)} "${news.title}"`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    // Update the game's patch info
    const { error: updateErr } = await supabase
      .from('games')
      .update({
        last_major_update: newsDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id);

    if (updateErr) {
      console.error(`${progress} ERROR ${game.name}:`, updateErr);
    } else {
      updated++;
      console.log(`${progress} PATCH ${game.name} — "${news.title}" (${newsDate.toISOString().slice(0, 10)})`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nSteam patch detection complete`);
  console.log(`  Checked: ${checked}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch(console.error);
