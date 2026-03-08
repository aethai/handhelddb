/**
 * Cron: Recalculate consensus ratings for all game-device pairs
 *
 * Fetches all game-device pairs that have 3+ performance reports,
 * calculates consensus using the weighted scoring algorithm, generates
 * TDP profiles (battery_saver, balanced, performance), and upserts
 * to the consensus_ratings table.
 *
 * Schedule: every 12 hours
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

// ====== Consensus algorithm (mirrored from src/lib/consensus.ts) ======

interface ReportRow {
  id: string;
  game_id: string;
  device_id: string;
  fps_avg: number;
  fps_low: number | null;
  preset: string | null;
  resolution: string | null;
  tdp_limit_watts: number | null;
  battery_life_hours: number | null;
  thermal: string | null;
  fan_noise: string | null;
  quality_tier: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  is_flagged: boolean;
  is_stale: boolean;
  fsr_enabled: boolean;
  fsr_mode: string | null;
  custom_settings: Record<string, string> | null;
  overall_rating: string;
  gpu_clock_mhz: number | null;
}

interface TDPProfile {
  tdpWatts: number;
  gpuClockMhz?: number;
  fpsTarget: number;
  fpsAvg: number;
  resolution: string;
  preset: string;
  fsrEnabled: boolean;
  fsrMode?: string;
  estimatedBatteryHours: number;
  thermal: string;
  fanNoise: string;
  keySettings?: Record<string, string>;
  reportCount: number;
  confidence: string;
}

const QUALITY_WEIGHTS: Record<string, number> = {
  verified: 5.0,
  community_confirmed: 3.0,
  reported: 1.0,
  ai_estimated: 0.5,
  imported: 0.3,
};

const HALF_LIFE_DAYS = 90;

function calculateWeight(report: ReportRow, now: Date): number {
  const qualityWeight = QUALITY_WEIGHTS[report.quality_tier] ?? 1.0;

  const ageMs = now.getTime() - new Date(report.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

  const up = report.upvotes;
  const down = report.downvotes;
  const voteWeight = (up + 1) / (up + down + 2);

  return qualityWeight * recencyWeight * voteWeight;
}

function weightedMedian(values: { value: number; weight: number }[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, v) => sum + v.weight, 0);
  let accumulated = 0;

  for (const item of sorted) {
    accumulated += item.weight;
    if (accumulated >= totalWeight / 2) {
      return item.value;
    }
  }

  return sorted[sorted.length - 1]?.value ?? 0;
}

function weightedMode<T>(values: { value: T; weight: number }[]): T | null {
  if (values.length === 0) return null;

  const groups = new Map<string, { value: T; totalWeight: number }>();

  for (const { value, weight } of values) {
    const key = String(value);
    const existing = groups.get(key);
    if (existing) {
      existing.totalWeight += weight;
    } else {
      groups.set(key, { value, totalWeight: weight });
    }
  }

  let best: { value: T; totalWeight: number } | null = null;
  for (const group of groups.values()) {
    if (!best || group.totalWeight > best.totalWeight) {
      best = group;
    }
  }

  return best?.value ?? null;
}

function getConfidence(count: number): 'low' | 'medium' | 'high' {
  if (count < 3) return 'low';
  if (count <= 10) return 'medium';
  return 'high';
}

function getVerdict(fps: number): string {
  if (fps >= 60) return 'excellent';
  if (fps >= 40) return 'good';
  if (fps >= 30) return 'fair';
  if (fps >= 20) return 'poor';
  return 'unplayable';
}

// ====== TDP Profile generation ======

function generateTDPProfiles(
  reports: { report: ReportRow; weight: number }[],
): { batterySaver: TDPProfile | null; balanced: TDPProfile | null; performance: TDPProfile | null } {
  // Only use reports that have TDP data
  const withTdp = reports.filter((r) => r.report.tdp_limit_watts != null);

  if (withTdp.length < 2) {
    return { batterySaver: null, balanced: null, performance: null };
  }

  // Sort by TDP
  const sorted = [...withTdp].sort(
    (a, b) => a.report.tdp_limit_watts! - b.report.tdp_limit_watts!,
  );

  // Split into 3 buckets: lower third, middle third, upper third
  const thirdLen = Math.max(1, Math.floor(sorted.length / 3));
  const lowBucket = sorted.slice(0, thirdLen);
  const midBucket = sorted.slice(thirdLen, thirdLen * 2);
  const highBucket = sorted.slice(thirdLen * 2);

  function buildProfile(bucket: typeof sorted): TDPProfile | null {
    if (bucket.length === 0) return null;

    const tdpValues = bucket.map((r) => ({
      value: r.report.tdp_limit_watts!,
      weight: r.weight,
    }));
    const fpsValues = bucket.map((r) => ({
      value: r.report.fps_avg,
      weight: r.weight,
    }));
    const batteryValues = bucket
      .filter((r) => r.report.battery_life_hours != null)
      .map((r) => ({
        value: r.report.battery_life_hours!,
        weight: r.weight,
      }));

    const tdp = weightedMedian(tdpValues);
    const fps = weightedMedian(fpsValues);
    const battery = batteryValues.length > 0 ? weightedMedian(batteryValues) : 0;

    const resolution = weightedMode(
      bucket
        .filter((r) => r.report.resolution != null)
        .map((r) => ({ value: r.report.resolution!, weight: r.weight })),
    );

    const preset = weightedMode(
      bucket
        .filter((r) => r.report.preset != null)
        .map((r) => ({ value: r.report.preset!, weight: r.weight })),
    );

    const thermal = weightedMode(
      bucket
        .filter((r) => r.report.thermal != null)
        .map((r) => ({ value: r.report.thermal!, weight: r.weight })),
    );

    const fanNoise = weightedMode(
      bucket
        .filter((r) => r.report.fan_noise != null)
        .map((r) => ({ value: r.report.fan_noise!, weight: r.weight })),
    );

    const fsrEnabled = bucket.filter((r) => r.report.fsr_enabled).length > bucket.length / 2;

    const fsrMode = fsrEnabled
      ? weightedMode(
          bucket
            .filter((r) => r.report.fsr_mode != null)
            .map((r) => ({ value: r.report.fsr_mode!, weight: r.weight })),
        )
      : undefined;

    // Determine FPS target bucket
    let fpsTarget = 30;
    if (fps >= 55) fpsTarget = 60;
    else if (fps >= 35) fpsTarget = 40;

    return {
      tdpWatts: Math.round(tdp * 10) / 10,
      fpsTarget,
      fpsAvg: Math.round(fps * 10) / 10,
      resolution: resolution ?? '1280x800',
      preset: preset ?? 'medium',
      fsrEnabled,
      fsrMode: fsrMode ?? undefined,
      estimatedBatteryHours: Math.round(battery * 10) / 10,
      thermal: thermal ?? 'warm',
      fanNoise: fanNoise ?? 'audible',
      reportCount: bucket.length,
      confidence: getConfidence(bucket.length),
    };
  }

  return {
    batterySaver: buildProfile(lowBucket),
    balanced: buildProfile(midBucket),
    performance: buildProfile(highBucket),
  };
}

// ====== Main ======

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Consensus recalculation starting...`);

  // Step 1: Find all game-device pairs with 3+ reports
  // We use an RPC or raw query approach; Supabase doesn't support GROUP BY + HAVING directly.
  // Instead, fetch all non-flagged, non-stale reports and group in code.
  console.log('Fetching all active performance reports...');

  const allReports: ReportRow[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('performance_reports')
      .select(
        'id, game_id, device_id, fps_avg, fps_low, preset, resolution, tdp_limit_watts, battery_life_hours, thermal, fan_noise, quality_tier, upvotes, downvotes, created_at, is_flagged, is_stale, fsr_enabled, fsr_mode, custom_settings, overall_rating, gpu_clock_mhz',
      )
      .eq('is_flagged', false)
      .eq('is_stale', false)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch reports:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allReports.push(...(data as ReportRow[]));

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Fetched ${allReports.length} active reports`);

  // Group by game_id + device_id
  const groups = new Map<string, ReportRow[]>();
  for (const report of allReports) {
    const key = `${report.game_id}::${report.device_id}`;
    const list = groups.get(key);
    if (list) {
      list.push(report);
    } else {
      groups.set(key, [report]);
    }
  }

  // Filter to pairs with 3+ reports
  const eligiblePairs = [...groups.entries()].filter(([, reports]) => reports.length >= 3);
  console.log(`Found ${eligiblePairs.length} game-device pairs with 3+ reports\n`);

  let upserted = 0;
  let failed = 0;

  for (const [key, reports] of eligiblePairs) {
    const [gameId, deviceId] = key.split('::');

    try {
      const now = new Date();
      const weighted = reports.map((report) => ({
        report,
        weight: calculateWeight(report, now),
      }));

      // Calculate consensus values
      const fpsAvg = weightedMedian(
        weighted.map((w) => ({ value: w.report.fps_avg, weight: w.weight })),
      );

      const fpsLowValues = weighted
        .filter((w) => w.report.fps_low != null)
        .map((w) => ({ value: w.report.fps_low!, weight: w.weight }));
      const fpsLow = fpsLowValues.length > 0 ? weightedMedian(fpsLowValues) : null;

      const recommendedPreset = weightedMode(
        weighted
          .filter((w) => w.report.preset != null)
          .map((w) => ({ value: w.report.preset!, weight: w.weight })),
      );

      const recommendedResolution = weightedMode(
        weighted
          .filter((w) => w.report.resolution != null)
          .map((w) => ({ value: w.report.resolution!, weight: w.weight })),
      );

      const tdpValues = weighted
        .filter((w) => w.report.tdp_limit_watts != null)
        .map((w) => ({ value: w.report.tdp_limit_watts!, weight: w.weight }));
      const recommendedTdp = tdpValues.length > 0 ? weightedMedian(tdpValues) : null;

      const batteryValues = weighted
        .filter((w) => w.report.battery_life_hours != null)
        .map((w) => ({ value: w.report.battery_life_hours!, weight: w.weight }));
      const estimatedBattery = batteryValues.length > 0 ? weightedMedian(batteryValues) : null;

      const typicalThermal = weightedMode(
        weighted
          .filter((w) => w.report.thermal != null)
          .map((w) => ({ value: w.report.thermal!, weight: w.weight })),
      );

      const typicalFanNoise = weightedMode(
        weighted
          .filter((w) => w.report.fan_noise != null)
          .map((w) => ({ value: w.report.fan_noise!, weight: w.weight })),
      );

      const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
      const weightedScore =
        weighted.reduce((sum, w) => sum + w.report.fps_avg * w.weight, 0) / totalWeight;

      // Generate TDP profiles
      const { batterySaver, balanced, performance } = generateTDPProfiles(weighted);

      // Upsert consensus rating
      const { error: upsertError } = await supabase
        .from('consensus_ratings')
        .upsert(
          {
            game_id: gameId,
            device_id: deviceId,
            fps_avg: Math.round(fpsAvg * 10) / 10,
            fps_low: fpsLow != null ? Math.round(fpsLow * 10) / 10 : null,
            recommended_preset: recommendedPreset,
            recommended_resolution: recommendedResolution,
            recommended_tdp: recommendedTdp != null ? Math.round(recommendedTdp * 10) / 10 : null,
            estimated_battery: estimatedBattery != null ? Math.round(estimatedBattery * 10) / 10 : null,
            typical_thermal: typicalThermal,
            typical_fan_noise: typicalFanNoise,
            battery_saver_profile: batterySaver,
            balanced_profile: balanced,
            performance_profile: performance,
            report_count: reports.length,
            confidence_level: getConfidence(reports.length),
            overall_verdict: getVerdict(fpsAvg),
            weighted_score: Math.round(weightedScore * 10) / 10,
            last_calculated: new Date().toISOString(),
            is_stale: false,
          },
          { onConflict: 'game_id,device_id' },
        );

      if (upsertError) {
        console.log(`  FAIL  ${gameId} / ${deviceId} — ${upsertError.message}`);
        failed++;
      } else {
        const profiles = [
          batterySaver ? 'BS' : null,
          balanced ? 'BAL' : null,
          performance ? 'PERF' : null,
        ]
          .filter(Boolean)
          .join('+');

        console.log(
          `  OK    ${gameId.slice(0, 8)}... / ${deviceId.slice(0, 8)}... — ` +
          `${reports.length} reports, ${fpsAvg.toFixed(0)} fps, verdict: ${getVerdict(fpsAvg)}, ` +
          `profiles: ${profiles || 'none'}`,
        );
        upserted++;
      }
    } catch (e) {
      console.log(`  FAIL  ${gameId} / ${deviceId} — ${(e as Error).message}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nConsensus recalculation complete in ${elapsed}s`);
  console.log(`  Pairs processed: ${eligiblePairs.length}`);
  console.log(`  Upserted: ${upserted}`);
  console.log(`  Failed:   ${failed}`);
}

main().catch((err) => {
  console.error('Consensus recalculation failed:', err);
  process.exit(1);
});
