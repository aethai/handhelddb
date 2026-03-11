/**
 * Seed: Generate realistic performance reports for 100 games x 6 devices.
 *
 * Each game has a demand tier (heavy/medium/light) that sets baseline FPS.
 * Each device has performance/battery multipliers based on real hardware.
 * Reports use quality_tier='community_confirmed', moderation_status='approved'.
 *
 * Usage: npx tsx scripts/seed-performance-reports.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

// ── Device specs ──
interface DeviceProfile {
  slug: string;
  id: string; // filled from DB
  nativeRes: string;
  /** FPS multiplier relative to Steam Deck at 1280x800 medium */
  perfMultiplier: number;
  /** Base battery hours at 15W draw */
  baseBattery: number;
  tdpRange: [number, number]; // min, max
  defaultTdp: number;
}

const DEVICE_PROFILES: Record<string, Omit<DeviceProfile, 'id'>> = {
  'steam-deck-oled': {
    slug: 'steam-deck-oled',
    nativeRes: '1280x800',
    perfMultiplier: 1.0,
    baseBattery: 3.0,
    tdpRange: [7, 15],
    defaultTdp: 15,
  },
  'rog-ally': {
    slug: 'rog-ally',
    nativeRes: '1920x1080',
    perfMultiplier: 1.15, // faster chip but pushing higher res
    baseBattery: 1.8,     // small 40Wh battery
    tdpRange: [9, 30],
    defaultTdp: 17,
  },
  'rog-ally-x': {
    slug: 'rog-ally-x',
    nativeRes: '1920x1080',
    perfMultiplier: 1.15,
    baseBattery: 3.5,     // 80Wh battery
    tdpRange: [9, 30],
    defaultTdp: 17,
  },
  'legion-go': {
    slug: 'legion-go',
    nativeRes: '2560x1600',
    perfMultiplier: 1.0,  // same chip but much higher res cancels advantage
    baseBattery: 2.2,     // 49.2Wh
    tdpRange: [8, 30],
    defaultTdp: 20,
  },
  'legion-go-s': {
    slug: 'legion-go-s',
    nativeRes: '1920x1200',
    perfMultiplier: 0.8,  // Z2 Go is weaker
    baseBattery: 2.8,     // 55.5Wh
    tdpRange: [8, 25],
    defaultTdp: 15,
  },
  'msi-claw-8-ai-plus': {
    slug: 'msi-claw-8-ai-plus',
    nativeRes: '1920x1200',
    perfMultiplier: 1.05, // Intel Ultra 7, roughly similar
    baseBattery: 3.5,     // 80Wh
    tdpRange: [9, 28],
    defaultTdp: 20,
  },
};

// ── Game demand tiers ──
type DemandTier = 'ultra_heavy' | 'heavy' | 'medium' | 'light' | 'very_light';

/** Baseline FPS range for Steam Deck at medium preset, 1280x800 */
const TIER_FPS: Record<DemandTier, { min: number; max: number; bestPreset: string }> = {
  ultra_heavy: { min: 22, max: 32, bestPreset: 'low' },
  heavy:       { min: 30, max: 42, bestPreset: 'low' },
  medium:      { min: 38, max: 52, bestPreset: 'medium' },
  light:       { min: 50, max: 60, bestPreset: 'high' },
  very_light:  { min: 60, max: 60, bestPreset: 'ultra' },
};

// ── 100 game seed list ──
interface GameSeed {
  name: string;
  tier: DemandTier;
  /** chance of FSR being used (0-1) */
  fsrChance: number;
}

const GAMES: GameSeed[] = [
  // Ultra Heavy (15)
  { name: 'Cyberpunk 2077', tier: 'ultra_heavy', fsrChance: 0.8 },
  { name: 'ELDEN RING', tier: 'ultra_heavy', fsrChance: 0.5 },
  { name: "Marvel's Spider-Man 2", tier: 'ultra_heavy', fsrChance: 0.9 },
  { name: 'Red Dead Redemption 2', tier: 'ultra_heavy', fsrChance: 0.6 },
  { name: 'Hogwarts Legacy', tier: 'ultra_heavy', fsrChance: 0.8 },
  { name: 'FINAL FANTASY VII REBIRTH', tier: 'ultra_heavy', fsrChance: 0.9 },
  { name: 'FINAL FANTASY XV WINDOWS EDITION', tier: 'ultra_heavy', fsrChance: 0.7 },
  { name: 'A Plague Tale: Requiem', tier: 'ultra_heavy', fsrChance: 0.8 },
  { name: "Baldur's Gate 3", tier: 'ultra_heavy', fsrChance: 0.5 },
  { name: 'Like a Dragon: Infinite Wealth', tier: 'ultra_heavy', fsrChance: 0.6 },
  { name: 'Forza Horizon 5', tier: 'ultra_heavy', fsrChance: 0.5 },
  { name: 'Horizon Zero Dawn™ Remastered', tier: 'ultra_heavy', fsrChance: 0.8 },
  { name: 'Atomic Heart', tier: 'ultra_heavy', fsrChance: 0.7 },
  { name: 'Resident Evil Village', tier: 'ultra_heavy', fsrChance: 0.6 },
  { name: 'ARMORED CORE™ VI FIRES OF RUBICON™', tier: 'ultra_heavy', fsrChance: 0.5 },

  // Heavy (20)
  { name: 'God of War', tier: 'heavy', fsrChance: 0.4 },
  { name: 'God of War Ragnarök', tier: 'heavy', fsrChance: 0.6 },
  { name: "Marvel's Spider-Man Remastered", tier: 'heavy', fsrChance: 0.5 },
  { name: "Marvel's Spider-Man: Miles Morales", tier: 'heavy', fsrChance: 0.5 },
  { name: 'The Witcher 3: Wild Hunt', tier: 'heavy', fsrChance: 0.3 },
  { name: 'Ghost of Tsushima DIRECTOR\'S CUT', tier: 'heavy', fsrChance: 0.5 },
  { name: 'DARK SOULS™ III', tier: 'heavy', fsrChance: 0.2 },
  { name: 'Sekiro™: Shadows Die Twice - GOTY Edition', tier: 'heavy', fsrChance: 0.2 },
  { name: 'Monster Hunter: World', tier: 'heavy', fsrChance: 0.4 },
  { name: 'MONSTER HUNTER RISE', tier: 'heavy', fsrChance: 0.3 },
  { name: 'Lies of P', tier: 'heavy', fsrChance: 0.5 },
  { name: 'No Man\'s Sky', tier: 'heavy', fsrChance: 0.5 },
  { name: 'Metro Exodus', tier: 'heavy', fsrChance: 0.6 },
  { name: 'Control Ultimate Edition', tier: 'heavy', fsrChance: 0.7 },
  { name: 'Nioh 2 – The Complete Edition', tier: 'heavy', fsrChance: 0.3 },
  { name: 'Days Gone', tier: 'heavy', fsrChance: 0.4 },
  { name: 'DEATH STRANDING DIRECTOR\'S CUT', tier: 'heavy', fsrChance: 0.4 },
  { name: 'UNCHARTED™: Legacy of Thieves Collection', tier: 'heavy', fsrChance: 0.5 },
  { name: 'Batman™: Arkham Knight', tier: 'heavy', fsrChance: 0.2 },
  { name: 'NieR:Automata™', tier: 'heavy', fsrChance: 0.3 },

  // Medium (30)
  { name: 'Hades II', tier: 'medium', fsrChance: 0.1 },
  { name: 'DOOM Eternal', tier: 'medium', fsrChance: 0.1 },
  { name: 'Metaphor: ReFantazio', tier: 'medium', fsrChance: 0.3 },
  { name: 'Persona 5 Royal', tier: 'medium', fsrChance: 0.1 },
  { name: 'DAVE THE DIVER', tier: 'medium', fsrChance: 0.0 },
  { name: 'Palworld', tier: 'medium', fsrChance: 0.5 },
  { name: 'Disco Elysium - The Final Cut', tier: 'medium', fsrChance: 0.0 },
  { name: 'Hi-Fi RUSH', tier: 'medium', fsrChance: 0.2 },
  { name: 'Psychonauts 2', tier: 'medium', fsrChance: 0.2 },
  { name: 'Satisfactory', tier: 'medium', fsrChance: 0.4 },
  { name: 'Valheim', tier: 'medium', fsrChance: 0.3 },
  { name: 'Subnautica', tier: 'medium', fsrChance: 0.2 },
  { name: 'Subnautica: Below Zero', tier: 'medium', fsrChance: 0.2 },
  { name: 'Deep Rock Galactic', tier: 'medium', fsrChance: 0.1 },
  { name: 'Borderlands 3', tier: 'medium', fsrChance: 0.3 },
  { name: 'It Takes Two', tier: 'medium', fsrChance: 0.2 },
  { name: 'DARK SOULS™: REMASTERED', tier: 'medium', fsrChance: 0.0 },
  { name: 'A Plague Tale: Innocence', tier: 'medium', fsrChance: 0.2 },
  { name: 'Ori and the Will of the Wisps', tier: 'medium', fsrChance: 0.0 },
  { name: 'Outer Wilds', tier: 'medium', fsrChance: 0.1 },
  { name: 'Risk of Rain 2', tier: 'medium', fsrChance: 0.1 },
  { name: 'FINAL FANTASY VII REMAKE INTERGRADE', tier: 'medium', fsrChance: 0.4 },
  { name: 'FINAL FANTASY X/X-2 HD Remaster', tier: 'medium', fsrChance: 0.0 },
  { name: 'Sifu', tier: 'medium', fsrChance: 0.3 },
  { name: 'Remnant: From the Ashes', tier: 'medium', fsrChance: 0.3 },
  { name: 'Lethal Company', tier: 'medium', fsrChance: 0.1 },
  { name: 'Diablo® IV', tier: 'medium', fsrChance: 0.4 },
  { name: 'Gunfire Reborn', tier: 'medium', fsrChance: 0.1 },
  { name: 'Sea of Stars', tier: 'medium', fsrChance: 0.0 },
  { name: 'Yakuza: Like a Dragon', tier: 'medium', fsrChance: 0.2 },

  // Light (25)
  { name: 'Hades', tier: 'light', fsrChance: 0.0 },
  { name: 'Hollow Knight', tier: 'light', fsrChance: 0.0 },
  { name: 'Celeste', tier: 'light', fsrChance: 0.0 },
  { name: 'Dead Cells', tier: 'light', fsrChance: 0.0 },
  { name: 'Slay the Spire', tier: 'light', fsrChance: 0.0 },
  { name: 'Cult of the Lamb', tier: 'light', fsrChance: 0.0 },
  { name: 'Cuphead', tier: 'light', fsrChance: 0.0 },
  { name: 'Enter the Gungeon', tier: 'light', fsrChance: 0.0 },
  { name: 'TUNIC', tier: 'light', fsrChance: 0.0 },
  { name: 'Inscryption', tier: 'light', fsrChance: 0.0 },
  { name: 'Neon White', tier: 'light', fsrChance: 0.0 },
  { name: 'Rogue Legacy 2', tier: 'light', fsrChance: 0.0 },
  { name: 'Half-Life 2', tier: 'light', fsrChance: 0.0 },
  { name: 'Portal 2', tier: 'light', fsrChance: 0.0 },
  { name: 'Katana ZERO', tier: 'light', fsrChance: 0.0 },
  { name: 'Brotato', tier: 'light', fsrChance: 0.0 },
  { name: 'Ori and the Blind Forest: Definitive Edition', tier: 'light', fsrChance: 0.0 },
  { name: 'Shovel Knight: Treasure Trove', tier: 'light', fsrChance: 0.0 },
  { name: 'The Binding of Isaac: Rebirth', tier: 'light', fsrChance: 0.0 },
  { name: 'Risk of Rain Returns', tier: 'light', fsrChance: 0.0 },
  { name: 'Yakuza 0', tier: 'light', fsrChance: 0.0 },
  { name: 'CRISIS CORE –FINAL FANTASY VII– REUNION', tier: 'light', fsrChance: 0.0 },
  { name: 'Alan Wake', tier: 'light', fsrChance: 0.0 },
  { name: 'Halo: The Master Chief Collection', tier: 'light', fsrChance: 0.0 },
  { name: 'Tomb Raider I-III Remastered Starring Lara Croft', tier: 'light', fsrChance: 0.0 },

  // Very Light (10)
  { name: 'Stardew Valley', tier: 'very_light', fsrChance: 0.0 },
  { name: 'Terraria', tier: 'very_light', fsrChance: 0.0 },
  { name: 'Vampire Survivors', tier: 'very_light', fsrChance: 0.0 },
  { name: 'Undertale', tier: 'very_light', fsrChance: 0.0 },
  { name: 'Factorio', tier: 'very_light', fsrChance: 0.0 },
  { name: 'FINAL FANTASY VI', tier: 'very_light', fsrChance: 0.0 },
  { name: 'FINAL FANTASY VII', tier: 'very_light', fsrChance: 0.0 },
  { name: 'Rogue Legacy', tier: 'very_light', fsrChance: 0.0 },
  { name: 'FINAL FANTASY IV', tier: 'very_light', fsrChance: 0.0 },
  { name: 'DARK SOULS™ II: Scholar of the First Sin', tier: 'very_light', fsrChance: 0.0 },
];

// ── Helpers ──

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Small random variance around a value (+/- pct) */
function vary(val: number, pct: number): number {
  const delta = val * pct;
  return Math.round((val + (Math.random() * 2 - 1) * delta) * 10) / 10;
}

function fpsToRating(fps: number): string {
  if (fps >= 55) return 'excellent';
  if (fps >= 40) return 'good';
  if (fps >= 30) return 'fair';
  if (fps >= 20) return 'poor';
  return 'unplayable';
}

function fpsToThermal(fps: number, tdp: number): string {
  if (tdp > 20) return pick(['warm', 'hot']);
  if (tdp > 15) return pick(['warm', 'warm', 'hot']);
  return pick(['cool', 'warm']);
}

function fpsToFanNoise(tdp: number): string {
  if (tdp > 25) return pick(['audible', 'loud']);
  if (tdp > 18) return pick(['audible', 'audible', 'quiet']);
  if (tdp > 12) return pick(['quiet', 'audible']);
  return pick(['silent', 'quiet']);
}

const PRESETS = ['ultra_low', 'low', 'medium', 'high', 'ultra'];

function getPreset(tier: DemandTier, deviceSlug: string): string {
  const base = TIER_FPS[tier].bestPreset;
  const idx = PRESETS.indexOf(base);
  // Higher res devices often need lower presets
  if (deviceSlug === 'legion-go' && idx > 0) return PRESETS[idx - 1];
  if (deviceSlug === 'legion-go-s' && idx > 0) return PRESETS[Math.max(0, idx - 1)];
  // Small random chance to try one preset up or down
  const shift = Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0;
  return PRESETS[Math.max(0, Math.min(PRESETS.length - 1, idx + shift))];
}

function getFsrMode(): string {
  return pick(['quality', 'balanced', 'performance']);
}

// Reasonable date spread: 2-180 days ago
function randomDate(): string {
  const daysAgo = Math.floor(Math.random() * 180) + 2;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// ── Main ──

async function main() {
  console.log('=== Seed Performance Reports ===\n');

  // 1. Fetch device IDs
  const { data: devices, error: devErr } = await supabase
    .from('devices')
    .select('id, slug, name')
    .eq('is_active', true);
  if (devErr) throw devErr;

  const deviceMap = new Map(devices!.map((d) => [d.slug, d]));
  console.log(`Devices: ${devices!.length}`);

  // 2. Fetch game IDs by exact name
  const gameNames = GAMES.map((g) => g.name);
  const { data: gamesDb, error: gameErr } = await supabase
    .from('games')
    .select('id, name, slug')
    .in('name', gameNames);
  if (gameErr) throw gameErr;

  const gameMap = new Map(gamesDb!.map((g) => [g.name, g]));
  const missing = GAMES.filter((g) => !gameMap.has(g.name));
  if (missing.length > 0) {
    console.warn(`\nWARNING: ${missing.length} games not found in DB:`);
    missing.forEach((g) => console.warn(`  - ${g.name}`));
  }
  console.log(`Games matched: ${gameMap.size} / ${GAMES.length}\n`);

  // 3. Generate reports
  const reports: any[] = [];
  let skipped = 0;

  for (const game of GAMES) {
    const gameRow = gameMap.get(game.name);
    if (!gameRow) { skipped++; continue; }

    for (const [slug, devProf] of Object.entries(DEVICE_PROFILES)) {
      const deviceRow = deviceMap.get(slug);
      if (!deviceRow) continue;

      const tierFps = TIER_FPS[game.tier];
      const reportCount = Math.floor(Math.random() * 4) + 3; // 3-6 reports

      for (let r = 0; r < reportCount; r++) {
        // Calculate FPS with device multiplier + random variance
        const baseFps = rand(tierFps.min, tierFps.max);
        let fps = Math.round(baseFps * devProf.perfMultiplier);
        fps = Math.max(10, Math.min(120, vary(fps, 0.1))); // +/- 10% variance

        const fpsLow = Math.round(fps * rand(0.55, 0.8));
        const preset = getPreset(game.tier, slug);
        const tdp = rand(devProf.tdpRange[0], devProf.tdpRange[1]);
        const useFsr = Math.random() < game.fsrChance;

        // Battery: inversely proportional to TDP
        const batteryBase = devProf.baseBattery * (devProf.defaultTdp / Math.max(tdp, 7));
        const battery = Math.round(vary(batteryBase, 0.15) * 10) / 10;

        reports.push({
          game_id: gameRow.id,
          device_id: deviceRow.id,
          fps_avg: fps,
          fps_low: fpsLow,
          resolution: devProf.nativeRes,
          preset,
          fsr_enabled: useFsr,
          fsr_mode: useFsr ? getFsrMode() : null,
          tdp_limit_watts: tdp,
          battery_life_hours: Math.max(0.5, Math.min(8, battery)),
          thermal: fpsToThermal(fps, tdp),
          fan_noise: fpsToFanNoise(tdp),
          overall_rating: fpsToRating(fps),
          quality_tier: 'community_confirmed',
          moderation_status: 'approved',
          source: 'seed',
          upvotes: Math.floor(Math.random() * 10),
          downvotes: Math.floor(Math.random() * 2),
          notes: null,
          created_at: randomDate(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`Generated ${reports.length} reports (skipped ${skipped} missing games)`);

  // 4. Insert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('performance_reports').insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE)} failed:`, error.message);
      // Try one by one to find problematic row
      for (const row of batch) {
        const { error: rowErr } = await supabase.from('performance_reports').insert(row);
        if (rowErr) {
          console.error(`  Failed row: game=${row.game_id} device=${row.device_id}:`, rowErr.message);
          break;
        }
        inserted++;
      }
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows (total: ${inserted})`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} / ${reports.length} reports.`);

  // 5. Validate
  const { count } = await supabase
    .from('performance_reports')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'seed');
  console.log(`Verification: ${count} seed reports in DB`);

  // Quick stats
  const { data: stats } = await supabase.rpc('', {}).catch(() => ({ data: null }));
  const { data: pairCount } = await supabase
    .from('performance_reports')
    .select('game_id, device_id')
    .eq('source', 'seed');
  const uniquePairs = new Set(pairCount?.map((r) => `${r.game_id}:${r.device_id}`));
  console.log(`Unique game-device pairs: ${uniquePairs.size}`);
}

main().catch(console.error);
