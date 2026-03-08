/**
 * Enriches games with HowLongToBeat data via direct HLTB API.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

interface HLTBResult {
  game_name: string;
  comp_main: number;
  comp_plus: number;
  comp_100: number;
}

async function searchHLTB(name: string): Promise<HLTBResult | null> {
  const searchName = name
    .replace(/[™®©]/g, '')
    .replace(/\s*[-–:]\s*(Digital|Deluxe|GOTY|Game of the Year|Ultimate|Complete|Premium|Standard|Special|Anniversary)\s*(Edition|Version)?$/i, '')
    .trim();

  const res = await fetch('https://howlongtobeat.com/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://howlongtobeat.com/',
      'Origin': 'https://howlongtobeat.com',
    },
    body: JSON.stringify({
      searchType: 'games',
      searchTerms: searchName.split(/\s+/),
      searchPage: 1,
      size: 5,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: { min: null, max: null },
          gameplay: { perspective: '', flow: '', genre: '' },
          rangeYear: { min: '', max: '' },
          modifier: '',
        },
        users: { sortCategory: 'postcount' },
        filter: '',
        sort: 0,
        randomizer: 0,
      },
    }),
  });

  if (!res.ok) {
    // Try alternative endpoint format
    const res2 = await fetch('https://howlongtobeat.com/api/search/' + Buffer.from(searchName).toString('base64').slice(0, 20), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://howlongtobeat.com/',
      },
      body: JSON.stringify({
        searchType: 'games',
        searchTerms: searchName.split(/\s+/),
        searchPage: 1,
        size: 5,
        searchOptions: {
          games: { userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main', rangeTime: { min: null, max: null }, gameplay: { perspective: '', flow: '', genre: '' }, rangeYear: { min: '', max: '' }, modifier: '' },
          users: { sortCategory: 'postcount' },
          filter: '',
          sort: 0,
          randomizer: 0,
        },
      }),
    });

    if (!res2.ok) {
      return null;
    }

    const data = await res2.json();
    return parseResult(data, searchName);
  }

  const data = await res.json();
  return parseResult(data, searchName);
}

function parseResult(data: any, searchName: string): HLTBResult | null {
  const games = data?.data ?? [];
  if (games.length === 0) return null;

  // Find best match by name similarity
  const normalizedSearch = searchName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = games.find((g: any) => {
    const normalized = (g.game_name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized === normalizedSearch || normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  }) ?? games[0];

  return {
    game_name: match.game_name,
    comp_main: (match.comp_main ?? 0) / 3600, // seconds to hours
    comp_plus: (match.comp_plus ?? 0) / 3600,
    comp_100: (match.comp_100 ?? 0) / 3600,
  };
}

async function main() {
  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, hltb_main_hours')
    .is('hltb_main_hours', null)
    .order('name');

  if (error) {
    console.error('Failed to fetch games:', error);
    process.exit(1);
  }

  console.log(`Found ${games.length} games without HLTB data\n`);

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const result = await searchHLTB(game.name);

      if (!result) {
        console.log(`  SKIP  ${game.name} — no match`);
        skipped++;
        await delay(1500);
        continue;
      }

      const updates: Record<string, number> = {};
      if (result.comp_main > 0) updates.hltb_main_hours = round(result.comp_main);
      if (result.comp_plus > 0) updates.hltb_extra_hours = round(result.comp_plus);
      if (result.comp_100 > 0) updates.hltb_completionist_hours = round(result.comp_100);

      if (Object.keys(updates).length === 0) {
        console.log(`  SKIP  ${game.name} — matched "${result.game_name}" but no time data`);
        skipped++;
        await delay(1500);
        continue;
      }

      const { error: updateError } = await supabase
        .from('games')
        .update(updates)
        .eq('id', game.id);

      if (updateError) {
        console.log(`  FAIL  ${game.name} — ${updateError.message}`);
        failed++;
      } else {
        console.log(`  OK    ${game.name} → ${result.game_name} — Main: ${updates.hltb_main_hours ?? '-'}h, Extra: ${updates.hltb_extra_hours ?? '-'}h, 100%: ${updates.hltb_completionist_hours ?? '-'}h`);
        enriched++;
      }

      await delay(1500);
    } catch (e) {
      console.log(`  FAIL  ${game.name} — ${(e as Error).message}`);
      failed++;
      await delay(3000);
    }
  }

  console.log(`\nDone: ${enriched} enriched, ${skipped} skipped, ${failed} failed`);
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

main();
