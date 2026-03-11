import type { TDPProfile } from './db/schema';

interface ReportInput {
  fpsAvg: number;
  fpsLow: number | null;
  preset: string | null;
  resolution: string | null;
  tdpLimitWatts: number | null;
  batteryLifeHours: number | null;
  thermal: string | null;
  fanNoise: string | null;
  qualityTier: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  isFlagged: boolean;
  isStale: boolean;
  fsrEnabled: boolean;
  fsrMode: string | null;
  customSettings: Record<string, string> | null;
}

interface WeightedReport {
  report: ReportInput;
  weight: number;
}

export interface ConsensusResult {
  fpsAvg: number;
  fpsLow: number | null;
  recommendedPreset: string | null;
  recommendedResolution: string | null;
  recommendedTdp: number | null;
  estimatedBattery: number | null;
  typicalThermal: string | null;
  typicalFanNoise: string | null;
  reportCount: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  overallVerdict: string;
  weightedScore: number;
  recommendedProfile: TDPProfile | null;
}

const QUALITY_WEIGHTS: Record<string, number> = {
  verified: 5.0,
  community_confirmed: 3.0,
  reported: 1.0,
  ai_estimated: 0.5,
  imported: 0.3,
};

const HALF_LIFE_DAYS = 90;

function calculateWeight(report: ReportInput, now: Date): number {
  const qualityWeight = QUALITY_WEIGHTS[report.qualityTier] ?? 1.0;

  const ageMs = now.getTime() - report.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

  const up = report.upvotes;
  const down = report.downvotes;
  const voteWeight = (up + 1) / (up + down + 2);

  return qualityWeight * recencyWeight * voteWeight;
}

function weightedMedian(values: { value: number; weight: number }[]): number {
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

export function calculateConsensus(reports: ReportInput[]): ConsensusResult | null {
  const activeReports = reports.filter((r) => !r.isFlagged && !r.isStale);

  if (activeReports.length === 0) return null;

  const now = new Date();
  const weighted: WeightedReport[] = activeReports.map((report) => ({
    report,
    weight: calculateWeight(report, now),
  }));

  const fpsAvg = weightedMedian(
    weighted.map((w) => ({ value: w.report.fpsAvg, weight: w.weight })),
  );

  const fpsLowValues = weighted
    .filter((w) => w.report.fpsLow != null)
    .map((w) => ({ value: w.report.fpsLow!, weight: w.weight }));
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
    .filter((w) => w.report.tdpLimitWatts != null)
    .map((w) => ({ value: w.report.tdpLimitWatts!, weight: w.weight }));
  const recommendedTdp =
    tdpValues.length > 0 ? weightedMedian(tdpValues) : null;

  const batteryValues = weighted
    .filter((w) => w.report.batteryLifeHours != null)
    .map((w) => ({ value: w.report.batteryLifeHours!, weight: w.weight }));
  const estimatedBattery =
    batteryValues.length > 0 ? weightedMedian(batteryValues) : null;

  const typicalThermal = weightedMode(
    weighted
      .filter((w) => w.report.thermal != null)
      .map((w) => ({ value: w.report.thermal!, weight: w.weight })),
  );

  const typicalFanNoise = weightedMode(
    weighted
      .filter((w) => w.report.fanNoise != null)
      .map((w) => ({ value: w.report.fanNoise!, weight: w.weight })),
  );

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const weightedScore =
    weighted.reduce((sum, w) => sum + w.report.fpsAvg * w.weight, 0) /
    totalWeight;

  return {
    fpsAvg,
    fpsLow,
    recommendedPreset,
    recommendedResolution,
    recommendedTdp,
    estimatedBattery,
    typicalThermal,
    typicalFanNoise,
    reportCount: activeReports.length,
    confidenceLevel: getConfidence(activeReports.length),
    overallVerdict: getVerdict(fpsAvg),
    weightedScore,
    recommendedProfile: null,
  };
}
