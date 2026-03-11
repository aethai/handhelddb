/**
 * Cron: Generate AI-estimated performance reports for enriched games.
 *
 * Takes games enriched by cron-enrich-games.ts, pairs them with each device,
 * and uses Claude Haiku to estimate realistic FPS data for 3 TDP profiles
 * (battery_saver, balanced, performance).
 *
 * Each TDP profile becomes one performance_report row with:
 *   quality_tier = 'ai_estimated'
 *   import_source = 'ai_estimation'
 *   import_source_id = '{game_id}:{device_id}:{tdp_label}'
 *
 * Schedule: daily at 6:00 AM UTC (1h after enrichment)
 * Batch: 50 game-device pairs per run → 150 reports
 * Model: Claude Haiku 4.5
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_PAIRS_PER_RUN = 50;
const GAMES_PER_BATCH = 5; // Games per Claude API call
const CLAUDE_DELAY_MS = 5000; // 5s between calls to avoid rate limits
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Device Hardware Matrix ──
interface DeviceSpec {
  id: string; // filled from DB
  slug: string;
  name: string;
  gpu: string;
  gpu_arch: string;
  cus: string;
  tdp_min: number;
  tdp_max: number;
  tdp_default: number;
  resolution: string;
  ram_gb: number;
  battery_wh: number;
}

// Will be populated from DB
let DEVICES: DeviceSpec[] = [];

// ── Claude API ──
interface TDPProfile {
  tdp_label: 'battery_saver' | 'balanced' | 'performance';
  tdp_watts: number;
  fps_avg: number;
  fps_low: number;
  resolution: string;
  preset: string;
  fsr_enabled: boolean;
  fsr_mode: string | null;
  fps_stability: string;
  thermal: string;
  fan_noise: string;
  battery_hours: number;
  overall_rating: string;
}

interface GameEstimation {
  game_slug: string;
  profiles: TDPProfile[];
}

const SYSTEM_PROMPT = `You are a handheld gaming performance expert. You estimate realistic FPS performance for PC games on handheld gaming devices.

You have deep knowledge of:
- GPU architectures: RDNA 2 (Steam Deck) vs RDNA 3 (ROG Ally, ROG Ally X, Legion Go)
- TDP-to-performance scaling: lower TDP = less power = lower FPS but better battery
- Resolution impact: 1280x800 (Deck) is ~56% of the pixels of 1920x1080, giving ~30-50% FPS advantage
- FSR/upscaling: Performance mode roughly doubles effective resolution, Quality mode ~1.5x
- Game optimization: Proton/Linux overhead varies. ProtonDB platinum = near-native. Bronze/borked = significant issues.
- Genre performance: 2D/indie/retro = easy 60fps. Modern AAA = challenging. Competitive shooters = medium.

KEY PERFORMANCE RELATIONSHIPS:
- RDNA 3 (12 CU @ 2.7GHz) at same TDP gives ~15-40% more FPS than RDNA 2 (8 CU @ 1.6GHz), varies heavily by game
- ROG Ally X (24GB) gets ~5-15% better performance than ROG Ally (16GB) — same chip, extra RAM bandwidth helps only in memory-bound scenarios
- At 1920x1080, expect ~60-70% of the FPS vs 1280x800 for same GPU/TDP
- At 2560x1600 (Legion Go), expect ~40-50% of 1280x800 FPS without FSR
- Battery saver TDP (low end) gives ~55-65% of performance TDP FPS
- Balanced TDP gives ~75-85% of performance TDP FPS
- Battery life (hours) ≈ battery_wh / tdp_watts (approximate)
- IMPORTANT: Be conservative. It is better to slightly underestimate than overestimate. Users prefer being pleasantly surprised over disappointed.

OVERALL RATING GUIDELINES:
- "excellent": 60+ fps avg, stable, comfortable experience
- "good": 45-59 fps avg, mostly stable
- "fair": 30-44 fps avg, playable but compromised
- "poor": 20-29 fps avg, below target, frequent dips
- "unplayable": <20 fps avg or major compatibility issues

PRESET GUIDELINES:
- Battery saver: typically "low" or "ultra_low" with FSR performance
- Balanced: typically "medium" with FSR balanced
- Performance: typically "high" or "medium" with FSR quality or off

You MUST respond with valid JSON only — no markdown fences, no extra text.`;

function buildUserPrompt(
  device: DeviceSpec,
  games: Array<{
    slug: string;
    name: string;
    genres: string[];
    protondb_tier: string | null;
    deck_compatibility: string | null;
    metacritic_score: number | null;
    cached_stats: Record<string, unknown> | null;
  }>,
): string {
  const gameDescriptions = games.map((g) => {
    const stats = g.cached_stats ?? {};
    return [
      `- "${g.name}" (${g.slug})`,
      `  Genres: ${(g.genres ?? []).slice(0, 3).join(', ') || 'unknown'}`,
      `  ProtonDB: ${g.protondb_tier ?? 'unknown'} (${stats.protondb_confidence ?? '?'} confidence, ${stats.protondb_reports_total ?? '?'} reports)`,
      `  Deck: ${g.deck_compatibility ?? 'unknown'}`,
      `  Metacritic: ${g.metacritic_score ?? 'N/A'}`,
      `  Popularity: ${stats.steamspy_owners ?? 'unknown'} owners, ${stats.steamspy_ccu ?? '?'} CCU`,
    ].join('\n');
  });

  return `Estimate FPS performance for the following ${games.length} games on this device:

DEVICE: ${device.name}
- GPU: ${device.gpu} (${device.gpu_arch}, ${device.cus})
- TDP range: ${device.tdp_min}W - ${device.tdp_max}W (default: ${device.tdp_default}W)
- Native resolution: ${device.resolution}
- RAM: ${device.ram_gb}GB
- Battery: ${device.battery_wh} Wh

GAMES:
${gameDescriptions.join('\n\n')}

For EACH game, provide 3 TDP profiles: battery_saver (low TDP), balanced (default TDP), performance (max TDP).

Use these TDP values:
- battery_saver: ${device.tdp_min}W
- balanced: ${device.tdp_default}W
- performance: ${device.tdp_max}W

Respond with a JSON array:
[
  {
    "game_slug": "the-game-slug",
    "profiles": [
      {
        "tdp_label": "battery_saver",
        "tdp_watts": ${device.tdp_min},
        "fps_avg": <number>,
        "fps_low": <number, typically 60-75% of avg>,
        "resolution": "<native or lower if needed>",
        "preset": "<ultra_low|low|medium|high|ultra>",
        "fsr_enabled": <true|false>,
        "fsr_mode": "<quality|balanced|performance|ultra_performance|null>",
        "fps_stability": "<stable|mostly_stable|unstable>",
        "thermal": "<cool|warm|hot>",
        "fan_noise": "<silent|quiet|audible|loud>",
        "battery_hours": <number>,
        "overall_rating": "<excellent|good|fair|poor|unplayable>"
      },
      { "tdp_label": "balanced", ... },
      { "tdp_label": "performance", ... }
    ]
  },
  ...
]`;
}

async function callClaude(userMessage: string): Promise<GameEstimation[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (response.status === 429) {
      // Rate limited — exponential backoff
      const waitMs = CLAUDE_DELAY_MS * attempt * 2;
      console.log(`  Rate limited, waiting ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    let text: string = data.content?.[0]?.text ?? '';

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in Claude response: ${text.slice(0, 300)}`);
    }

    return JSON.parse(jsonMatch[0]) as GameEstimation[];
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

// ── Main ──
async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Performance report generation starting...`);

  // Load devices from DB (exclude Nintendo Switch 2 — different ecosystem)
  const { data: dbDevices, error: devError } = await supabase
    .from('devices')
    .select('id, slug, name, gpu, chip, tdp_min, tdp_max, tdp_default, screen_resolution, ram_gb, battery_wh')
    .eq('is_active', true)
    .neq('slug', 'nintendo-switch-2');

  if (devError || !dbDevices) {
    console.error('Failed to load devices:', devError?.message);
    process.exit(1);
  }

  DEVICES = dbDevices.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    gpu: d.gpu ?? d.chip ?? 'Unknown',
    gpu_arch: d.chip?.includes('Van Gogh') ? 'RDNA 2' :
              d.chip?.includes('Intel') ? 'Xe2' :
              d.chip?.includes('Z2') ? 'RDNA 3.5' : 'RDNA 3',
    cus: d.gpu ?? '',
    tdp_min: d.tdp_min ?? 8,
    tdp_max: d.tdp_max ?? 25,
    tdp_default: d.tdp_default ?? 15,
    resolution: d.screen_resolution ?? '1920x1080',
    ram_gb: d.ram_gb ?? 16,
    battery_wh: d.battery_wh ?? 50,
  }));

  console.log(`Loaded ${DEVICES.length} devices: ${DEVICES.map((d) => d.slug).join(', ')}`);

  // Load enriched games (have cached_stats.enriched_at)
  const { data: allGames, error: gamesError } = await supabase
    .from('games')
    .select('id, slug, name, genres, protondb_tier, deck_compatibility, metacritic_score, cached_stats, steam_appid')
    .not('steam_appid', 'is', null)
    .not('cached_stats', 'is', null)
    .order('metacritic_score', { ascending: false, nullsFirst: false })
    .limit(500);

  if (gamesError) {
    console.error('Failed to load games:', gamesError.message);
    process.exit(1);
  }

  // Filter to actually enriched games
  const enrichedGames = allGames.filter((g) => {
    const stats = g.cached_stats as Record<string, unknown> | null;
    return stats?.enriched_at;
  });

  console.log(`Found ${enrichedGames.length} enriched games\n`);

  if (enrichedGames.length === 0) {
    console.log('No enriched games found. Run cron-enrich-games.ts first.');
    process.exit(0);
  }

  // Load existing AI reports to avoid duplicates
  const { data: existingReports } = await supabase
    .from('performance_reports')
    .select('import_source_id')
    .eq('import_source', 'ai_estimation');

  const existingIds = new Set((existingReports ?? []).map((r) => r.import_source_id));
  console.log(`Found ${existingIds.size} existing AI-estimated reports to skip\n`);

  // Build game-device pairs, skip existing
  const pairs: Array<{ game: typeof enrichedGames[0]; device: DeviceSpec }> = [];

  for (const game of enrichedGames) {
    for (const device of DEVICES) {
      // Check if any profile already exists for this pair
      const baseKey = `${game.id}:${device.id}`;
      if (
        existingIds.has(`${baseKey}:battery_saver`) &&
        existingIds.has(`${baseKey}:balanced`) &&
        existingIds.has(`${baseKey}:performance`)
      ) {
        continue; // All 3 profiles exist
      }
      pairs.push({ game, device });
    }
  }

  console.log(`${pairs.length} game-device pairs need reports (max ${MAX_PAIRS_PER_RUN} per run)\n`);

  // Take first N pairs
  const batch = pairs.slice(0, MAX_PAIRS_PER_RUN);

  // Group by device for efficient batching
  const byDevice = new Map<string, Array<typeof enrichedGames[0]>>();
  for (const { game, device } of batch) {
    const key = device.slug;
    if (!byDevice.has(key)) byDevice.set(key, []);
    byDevice.get(key)!.push(game);
  }

  let reportsInserted = 0;
  let apiCalls = 0;
  let errors = 0;

  for (const [deviceSlug, games] of byDevice) {
    const device = DEVICES.find((d) => d.slug === deviceSlug)!;
    console.log(`\n── ${device.name} (${games.length} games) ──`);

    // Process in batches of GAMES_PER_BATCH
    for (let i = 0; i < games.length; i += GAMES_PER_BATCH) {
      const gameBatch = games.slice(i, i + GAMES_PER_BATCH);
      const progress = `[${i + 1}-${Math.min(i + GAMES_PER_BATCH, games.length)}/${games.length}]`;

      try {
        const prompt = buildUserPrompt(device, gameBatch.map((g) => ({
          slug: g.slug,
          name: g.name,
          genres: (g.genres as string[]) ?? [],
          protondb_tier: g.protondb_tier,
          deck_compatibility: g.deck_compatibility,
          metacritic_score: g.metacritic_score,
          cached_stats: g.cached_stats as Record<string, unknown> | null,
        })));

        const estimations = await callClaude(prompt);
        apiCalls++;

        // Insert each profile as a separate report
        for (const est of estimations) {
          const game = gameBatch.find((g) => g.slug === est.game_slug);
          if (!game) {
            console.log(`  WARN: Claude returned unknown slug "${est.game_slug}"`);
            continue;
          }

          for (const profile of est.profiles) {
            const importSourceId = `${game.id}:${device.id}:${profile.tdp_label}`;

            // Skip if already exists
            if (existingIds.has(importSourceId)) continue;

            const report = {
              game_id: game.id,
              device_id: device.id,
              user_id: null,
              fps_avg: Math.round(profile.fps_avg),
              fps_low: profile.fps_low ? Math.round(profile.fps_low) : null,
              fps_target: profile.fps_avg >= 55 ? '60' : profile.fps_avg >= 35 ? '40' : '30',
              fps_stability: profile.fps_stability || 'mostly_stable',
              resolution: profile.resolution || device.resolution,
              preset: profile.preset || 'medium',
              fsr_enabled: profile.fsr_enabled ?? false,
              fsr_mode: profile.fsr_enabled ? (profile.fsr_mode || 'balanced') : null,
              tdp_limit_watts: profile.tdp_watts,
              gpu_clock_mhz: null,
              proton_version: null,
              battery_life_hours: profile.battery_hours ? Math.round(profile.battery_hours * 10) / 10 : null,
              thermal: profile.thermal || 'warm',
              fan_noise: profile.fan_noise || 'audible',
              controller_status: 'works_oob',
              anticheat_status: 'not_applicable',
              suspend_status: device.gpu_arch === 'RDNA 2' ? 'works' : 'unknown', // Deck has best suspend
              overall_rating: profile.overall_rating || 'fair',
              notes: `AI-estimated from ProtonDB (${(game.cached_stats as Record<string, unknown>)?.protondb_confidence ?? 'unknown'} confidence), Steam Deck verification, and hardware specs. ${profile.tdp_label.replace('_', ' ')} profile.`,
              quality_tier: 'ai_estimated',
              import_source: 'ai_estimation',
              import_source_id: importSourceId,
              source: 'manual',
              moderation_status: 'approved',
            };

            const { error: insertError } = await supabase
              .from('performance_reports')
              .insert(report);

            if (insertError) {
              if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
                // Already exists, skip silently
                existingIds.add(importSourceId);
              } else {
                console.log(`  FAIL: ${game.name} ${profile.tdp_label} — ${insertError.message}`);
                errors++;
              }
            } else {
              existingIds.add(importSourceId);
              reportsInserted++;
            }
          }
        }

        const names = gameBatch.map((g) => g.name.substring(0, 25)).join(', ');
        console.log(`${progress} OK    ${names}`);

        await sleep(CLAUDE_DELAY_MS);
      } catch (e) {
        const names = gameBatch.map((g) => g.name.substring(0, 25)).join(', ');
        console.log(`${progress} FAIL  ${names} — ${(e as Error).message.substring(0, 100)}`);
        errors++;
        await sleep(CLAUDE_DELAY_MS * 3);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nReport generation complete in ${elapsed}s`);
  console.log(`  Reports inserted: ${reportsInserted}`);
  console.log(`  Claude API calls: ${apiCalls}`);
  console.log(`  Errors:           ${errors}`);
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
