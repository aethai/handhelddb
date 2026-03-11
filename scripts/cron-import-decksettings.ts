/**
 * Cron: Import game reports from DeckSettings GitHub Issues
 *
 * Source: https://github.com/DeckSettings/game-reports-steamos
 * Reports are structured GitHub Issues with a markdown template.
 * Extracts: game name, Steam AppID, device, target FPS, TDP, GPU clock,
 *           resolution, graphics settings, battery draw, performance rating.
 *
 * Schedule: daily (low volume, ~400 total reports)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string,
  { auth: { persistSession: false } },
);

const REPO = 'DeckSettings/game-reports-steamos';
const IMPORT_SOURCE = 'decksettings';
const QUALITY_TIER = 'community_confirmed'; // structured reports with screenshots

// ── Device name mapping (DeckSettings label → our slug) ──

const DEVICE_MAP: Record<string, string> = {
  'valve steam deck': 'steam-deck-lcd',
  'valve steam deck lcd': 'steam-deck-lcd',
  'valve steam deck lcd (256gb/512gb)': 'steam-deck-lcd',
  'steam deck lcd': 'steam-deck-lcd',
  'steam deck lcd (256gb/512gb)': 'steam-deck-lcd',
  'valve steam deck oled': 'steam-deck-oled',
  'steam deck oled': 'steam-deck-oled',
  'asus rog ally': 'rog-ally',
  'asus rog ally z1 extreme': 'rog-ally',
  'rog ally': 'rog-ally',
  'asus rog ally x': 'rog-ally-x',
  'rog ally x': 'rog-ally-x',
  'lenovo legion go': 'legion-go',
  'legion go': 'legion-go',
  'lenovo legion go s': 'legion-go-s',
  'legion go s': 'legion-go-s',
  'gpd win 4': 'gpd-win-4',
  'ayaneo 2s': 'ayaneo-2s',
  'msi claw 8 ai+': 'msi-claw-8-ai-plus',
};

// ── Target framerate to numeric FPS ──
// NOTE: This is what the user SET as their target, NOT measured FPS.
// Must be combined with star rating to estimate actual performance.

function parseTargetFps(target: string): number {
  if (target.includes('60+')) return 60;
  if (target.includes('50-59')) return 55;
  if (target.includes('40-49')) return 45;
  if (target.includes('30-39')) return 35;
  if (target.includes('20-29')) return 25;
  return 30; // fallback
}

// ── Estimate actual FPS from target/cap + star rating ──
// DeckSettings reports don't have measured FPS — only target and subjective rating.
// Apply conservative multiplier based on how happy the user was.
const RATING_FPS_MULTIPLIER: Record<string, number> = {
  excellent: 0.85,  // Probably close to target, but not exact
  good: 0.70,       // Good experience, some frame drops
  fair: 0.50,       // Playable with noticeable issues
  poor: 0.30,       // Struggling hard
  unplayable: 0,    // Don't trust FPS at all
};

function estimateActualFps(targetFps: number, rating: string): number {
  const mult = RATING_FPS_MULTIPLIER[rating] ?? 0.50;
  if (rating === 'unplayable') return 15;
  return Math.max(10, Math.round(targetFps * mult));
}

// ── Detect desktop GPU mentions (spam/copy-paste from desktop) ──
function hasDesktopGPU(body: string): boolean {
  return /RTX\s*[234]\d{3}|GTX\s*1\d{3}|RX\s*[67]\d{3}|Radeon\s*RX/i.test(body);
}

// ── Battery estimation with system overhead ──
// DeckSettings "Average Battery Power Draw" often reports only SoC/TDP power,
// not total system draw. Screen, WiFi, memory, VRM add ~7-8W overhead.
const SYSTEM_OVERHEAD_W = 7; // minimum extra watts for screen+wifi+memory+misc

function estimateBatteryHours(
  reportedPowerDraw: number | null,
  tdpWatts: number | null,
  batteryWh: number | null,
): number | null {
  if (!batteryWh) return null;

  let totalDraw: number;
  if (reportedPowerDraw && reportedPowerDraw > 0) {
    // If reported draw is suspiciously close to TDP (within 2W), they likely
    // reported SoC power only — add system overhead
    if (tdpWatts && Math.abs(reportedPowerDraw - tdpWatts) <= 2) {
      totalDraw = reportedPowerDraw + SYSTEM_OVERHEAD_W;
    } else if (reportedPowerDraw < 10) {
      // Very low draw reported — likely SoC-only, add overhead
      totalDraw = reportedPowerDraw + SYSTEM_OVERHEAD_W;
    } else {
      // Higher draw — probably includes system overhead already
      totalDraw = Math.max(reportedPowerDraw, SYSTEM_OVERHEAD_W + 3);
    }
  } else if (tdpWatts) {
    totalDraw = tdpWatts + SYSTEM_OVERHEAD_W;
  } else {
    return null; // no power data at all
  }

  return Math.round((batteryWh / totalDraw) * 10) / 10;
}

// ── Parse markdown body to extract fields ──

function extractField(body: string, fieldName: string): string | null {
  const regex = new RegExp(`### ${fieldName}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`, 'i');
  const match = body.match(regex);
  if (!match) return null;
  const value = match[1].trim();
  if (value === '_No response_' || value === '') return null;
  return value;
}

function parseResolution(body: string): string | null {
  // Try Game Resolution field first
  const gameRes = extractField(body, 'Game Resolution');
  if (gameRes && gameRes !== 'Default' && gameRes !== 'Native') {
    const resMatch = gameRes.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
    if (resMatch) return `${resMatch[1]}x${resMatch[2]}`;
  }

  // Try from display settings
  const displaySettings = extractField(body, 'Game Display Settings');
  if (displaySettings) {
    const resMatch = displaySettings.match(/RESOLUTION[^:]*:\*?\*?\s*<?(\d{3,4})\s*[xX×]\s*(\d{3,4})/i);
    if (resMatch) return `${resMatch[1]}x${resMatch[2]}`;
  }

  return null;
}

function parseGraphicsPreset(body: string): string | null {
  const settings = extractField(body, 'Game Graphics Settings');
  if (!settings) return null;

  // Look for overall quality/preset line
  const presetMatch = settings.match(/(?:GRAPHIC|GRAPHICS|OVERALL)\s*QUALITY[^:]*:\*?\*?\s*([\w\s]+)/i);
  if (presetMatch) {
    const val = presetMatch[1].trim().toLowerCase();
    if (val.includes('ultra') && val.includes('low')) return 'ultra_low';
    if (val.includes('ultra')) return 'ultra';
    if (val.includes('very high') || val.includes('highest')) return 'ultra';
    if (val.includes('high')) return 'high';
    if (val.includes('medium') || val.includes('normal')) return 'medium';
    if (val.includes('low') || val.includes('lowest')) return 'low';
  }

  return 'custom';
}

function parseFSR(body: string): { enabled: boolean; mode: string | null } {
  const scalingFilter = extractField(body, 'Scaling Filter');
  if (scalingFilter && scalingFilter.toLowerCase().includes('fsr')) {
    return { enabled: true, mode: 'balanced' };
  }

  const settings = extractField(body, 'Game Graphics Settings') ?? '';
  const displaySettings = extractField(body, 'Game Display Settings') ?? '';
  const combined = settings + ' ' + displaySettings;

  if (/fsr|fidelityfx/i.test(combined)) {
    const modeMatch = combined.match(/(?:fsr|resolution scale)[^:]*:\*?\*?\s*(quality|balanced|performance|ultra_performance|ultra)/i);
    let mode = modeMatch ? modeMatch[1].toLowerCase() : 'balanced';
    if (mode === 'ultra') mode = 'ultra_performance';
    return { enabled: true, mode };
  }

  return { enabled: false, mode: null };
}

function parseRating(body: string): string | null {
  const rating = extractField(body, 'Performance Rating');
  if (!rating) return null;

  const stars = (rating.match(/★/g) || []).length;
  if (stars >= 5) return 'excellent';
  if (stars >= 4) return 'good';
  if (stars >= 3) return 'fair';
  if (stars >= 2) return 'poor';
  return 'unplayable';
}

function parseCustomSettings(body: string): Record<string, string> | null {
  const display = extractField(body, 'Game Display Settings');
  const graphics = extractField(body, 'Game Graphics Settings');
  const combined = (display ?? '') + '\n' + (graphics ?? '');

  const settings: Record<string, string> = {};
  // Extract "**KEY:** Value" patterns
  const regex = /\*\*([^*]+)\*\*:?\s*(.+)/g;
  let m;
  let count = 0;
  while ((m = regex.exec(combined)) !== null && count < 20) {
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const val = m[2].trim();
    if (val && val !== '_No response_') {
      settings[key] = val;
      count++;
    }
  }

  return Object.keys(settings).length > 0 ? settings : null;
}

// ── Fetch all issues from GitHub ──

async function fetchAllIssues(): Promise<any[]> {
  const issues: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/repos/${REPO}/issues?state=all&per_page=${perPage}&page=${page}`;
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!resp.ok) {
      console.error(`GitHub API error: ${resp.status} ${resp.statusText}`);
      break;
    }

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;

    // Filter out pull requests
    issues.push(...data.filter((i: any) => !i.pull_request));
    if (data.length < perPage) break;
    page++;
  }

  return issues;
}

// ── Main ──

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] DeckSettings import starting...`);

  // Load device mapping
  const { data: devicesData } = await supabase.from('devices').select('id, slug, battery_wh');
  const deviceBySlug = new Map<string, { id: string; batteryWh: number | null }>();
  for (const d of devicesData ?? []) {
    deviceBySlug.set(d.slug, { id: d.id, batteryWh: d.battery_wh });
  }

  // Check existing imports to avoid duplicates
  const { data: existing } = await supabase
    .from('performance_reports')
    .select('import_source_id')
    .eq('import_source', IMPORT_SOURCE);

  const existingIds = new Set((existing ?? []).map((r: any) => r.import_source_id));
  console.log(`Existing DeckSettings imports: ${existingIds.size}`);

  // Fetch issues
  console.log('Fetching issues from GitHub...');
  const issues = await fetchAllIssues();
  console.log(`Fetched ${issues.length} issues`);

  let imported = 0;
  let skipped = 0;
  let noMatch = 0;
  let errors = 0;

  for (const issue of issues) {
    const sourceId = `decksettings-${issue.number}`;

    // Skip already imported
    if (existingIds.has(sourceId)) {
      skipped++;
      continue;
    }

    const body = issue.body ?? '';

    // Parse App ID from title or body
    const appIdFromTitle = issue.title.match(/appid="(\d+)"/)?.[1];
    const appIdFromBody = extractField(body, 'App ID');
    const steamAppId = appIdFromTitle || appIdFromBody;

    if (!steamAppId || steamAppId === '_No response_') {
      // Non-Steam game, skip
      skipped++;
      continue;
    }

    // Match game by steam_appid
    const { data: game } = await supabase
      .from('games')
      .select('id, name')
      .eq('steam_appid', parseInt(steamAppId))
      .single();

    if (!game) {
      noMatch++;
      continue;
    }

    // Parse device from body or labels
    const deviceField = extractField(body, 'Device') ?? '';
    const deviceLabel = (issue.labels ?? [])
      .map((l: any) => l.name)
      .find((n: string) => n.startsWith('DEVICE:'))
      ?.replace('DEVICE:', '')
      .trim() ?? '';

    const deviceKey = (deviceField || deviceLabel).toLowerCase().trim();
    const deviceSlug = DEVICE_MAP[deviceKey];

    if (!deviceSlug || !deviceBySlug.has(deviceSlug)) {
      noMatch++;
      continue;
    }

    const deviceInfo = deviceBySlug.get(deviceSlug)!;

    // Spam detection: desktop GPU settings copy-pasted to handheld report
    if (hasDesktopGPU(body)) {
      console.log(`  SPAM #${issue.number} — desktop GPU detected in settings, skipping`);
      skipped++;
      continue;
    }

    // Parse fields
    const targetFps = extractField(body, 'Target Framerate') ?? '30-39 FPS';
    const rawTargetFps = parseTargetFps(targetFps);

    const frameLimitStr = extractField(body, 'Frame Limit');
    const frameLimit = frameLimitStr ? parseInt(frameLimitStr) : null;
    const rawFps = (frameLimit && frameLimit > 0) ? frameLimit : rawTargetFps;

    // IMPORTANT: Target/FrameLimit are SETTINGS, not measurements.
    // Apply conservative multiplier based on star rating.
    const overallRating = parseRating(body);
    const actualFps = estimateActualFps(rawFps, overallRating ?? 'fair');

    const tdpStr = extractField(body, 'TDP Limit');
    const tdpWatts = tdpStr ? parseFloat(tdpStr) : null;

    const gpuClockStr = extractField(body, 'Manual GPU Clock');
    const gpuClock = gpuClockStr ? parseInt(gpuClockStr) : null;

    const powerDrawStr = extractField(body, 'Average Battery Power Draw');
    const powerDraw = powerDrawStr && powerDrawStr !== 'Unknown' ? parseFloat(powerDrawStr) : null;
    const batteryHours = estimateBatteryHours(powerDraw, tdpWatts, deviceInfo.batteryWh);

    const resolution = parseResolution(body);
    const preset = parseGraphicsPreset(body);
    const fsr = parseFSR(body);
    const customSettings = parseCustomSettings(body);

    // Cross-source validation: check vs existing consensus
    let moderationStatus = 'approved';
    let notesSuffix = '';
    const { data: consensus } = await supabase
      .from('consensus_ratings')
      .select('fps_avg, report_count')
      .eq('game_id', game.id)
      .eq('device_id', deviceInfo.id)
      .single();

    if (consensus && consensus.fps_avg && consensus.report_count >= 3) {
      const deviation = Math.abs(actualFps - consensus.fps_avg);
      if (deviation > 15) {
        moderationStatus = 'pending';
        notesSuffix = ` [Auto-flagged: ${actualFps}fps vs ${consensus.fps_avg.toFixed(0)} consensus]`;
      }
    }

    // Determine thermal/fan based on power draw
    let thermal = 'warm';
    if (powerDraw && powerDraw > 20) thermal = 'hot';
    else if (powerDraw && powerDraw <= 8) thermal = 'cool';

    const report = {
      game_id: game.id,
      device_id: deviceInfo.id,
      fps_avg: actualFps,
      fps_low: null,
      fps_target: actualFps >= 55 ? 60 : actualFps >= 35 ? 40 : 30,
      fps_stability: 'mostly_stable',
      resolution: resolution,
      preset: preset,
      fsr_enabled: fsr.enabled,
      fsr_mode: fsr.mode,
      custom_settings: customSettings,
      tdp_limit_watts: tdpWatts,
      gpu_clock_mhz: gpuClock,
      battery_life_hours: batteryHours,
      thermal: thermal,
      fan_noise: 'audible',
      quality_tier: QUALITY_TIER,
      import_source: IMPORT_SOURCE,
      import_source_id: sourceId,
      overall_rating: overallRating ?? 'good',
      moderation_status: moderationStatus,
      notes: (extractField(body, 'Summary') ?? '').slice(0, 500) + ` [DeckSettings #${issue.number}]` + notesSuffix,
      source: 'decky_plugin',
      created_at: issue.created_at,
    };

    const { error } = await supabase.from('performance_reports').insert(report);

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        skipped++;
      } else {
        console.error(`  FAIL #${issue.number} ${game.name}: ${error.message}`);
        errors++;
      }
    } else {
      console.log(`  OK   #${issue.number} ${game.name} on ${deviceSlug} — ${actualFps}fps @ ${tdpWatts ?? '?'}W`);
      imported++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDeckSettings import complete in ${elapsed}s`);
  console.log(`  Issues fetched:  ${issues.length}`);
  console.log(`  Imported:        ${imported}`);
  console.log(`  Skipped (dupes): ${skipped}`);
  console.log(`  No match:        ${noMatch}`);
  console.log(`  Errors:          ${errors}`);
}

main().catch((err) => {
  console.error('DeckSettings import failed:', err);
  process.exit(1);
});
