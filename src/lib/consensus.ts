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

// ── Trust hierarchy: higher = more trusted ──
const QUALITY_WEIGHTS: Record<string, number> = {
  verified: 5.0,
  trusted_benchmark: 4.0,
  community_confirmed: 3.0,
  imported: 2.0,
  reported: 1.0,
  ai_estimated: 0.15,
};

// AI reports can never exceed this fraction of total consensus weight
const AI_WEIGHT_CAP = 0.30;

const HALF_LIFE_DAYS = 90;
const HALF_LIFE_STABLE_DAYS = 365; // For games not patched in 6+ months
const RECENCY_FLOOR = 0.2; // Never fully expire good data

function isAiReport(qualityTier: string): boolean {
  return qualityTier === 'ai_estimated';
}

function calculateWeight(report: ReportInput, now: Date, stableGame: boolean): number {
  const qualityWeight = QUALITY_WEIGHTS[report.qualityTier] ?? 1.0;

  const ageMs = now.getTime() - report.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const halfLife = stableGame ? HALF_LIFE_STABLE_DAYS : HALF_LIFE_DAYS;
  const recencyWeight = Math.max(RECENCY_FLOOR, Math.pow(0.5, ageDays / halfLife));

  const up = report.upvotes;
  const down = report.downvotes;
  const voteWeight = (up + 1) / (up + down + 2);

  return qualityWeight * recencyWeight * voteWeight;
}

// ── Outlier detection: Modified Z-score using MAD ──
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function removeOutliers(weighted: WeightedReport[]): WeightedReport[] {
  if (weighted.length < 3) return weighted;

  const fpsValues = weighted.map((w) => w.report.fpsAvg);
  const median = medianOf(fpsValues);
  const deviations = fpsValues.map((v) => Math.abs(v - median));
  const mad = medianOf(deviations);

  // MAD threshold: 3.5 (standard for modified Z-score)
  // If MAD is very small (< 2), use a minimum to avoid rejecting minor variance
  const threshold = Math.max(mad, 2.0) * 3.5;

  return weighted.filter((w) => Math.abs(w.report.fpsAvg - median) <= threshold);
}

// ── AI weight capping ──
function capAiWeight(weighted: WeightedReport[]): WeightedReport[] {
  const aiReports = weighted.filter((w) => isAiReport(w.report.qualityTier));
  const nonAiReports = weighted.filter((w) => !isAiReport(w.report.qualityTier));

  if (aiReports.length === 0 || nonAiReports.length === 0) return weighted;

  const aiTotalWeight = aiReports.reduce((sum, w) => sum + w.weight, 0);
  const nonAiTotalWeight = nonAiReports.reduce((sum, w) => sum + w.weight, 0);
  const totalWeight = aiTotalWeight + nonAiTotalWeight;

  const aiShare = aiTotalWeight / totalWeight;

  if (aiShare <= AI_WEIGHT_CAP) return weighted;

  // Scale down AI weights so they equal exactly AI_WEIGHT_CAP of total
  const targetAiWeight = (nonAiTotalWeight / (1 - AI_WEIGHT_CAP)) * AI_WEIGHT_CAP;
  const scaleFactor = targetAiWeight / aiTotalWeight;

  return [
    ...nonAiReports,
    ...aiReports.map((w) => ({ ...w, weight: w.weight * scaleFactor })),
  ];
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

function getConfidence(
  count: number,
  hasNonAiReport: boolean,
): 'low' | 'medium' | 'high' {
  // AI-only consensus can never be higher than 'low'
  if (!hasNonAiReport) return 'low';
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

export interface CalculateConsensusOptions {
  stableGame?: boolean; // true = no patches in 6+ months → slower decay
}

export function calculateConsensus(
  reports: ReportInput[],
  options: CalculateConsensusOptions = {},
): ConsensusResult | null {
  const activeReports = reports.filter((r) => !r.isFlagged && !r.isStale);

  if (activeReports.length === 0) return null;

  const stableGame = options.stableGame ?? false;
  const now = new Date();

  let weighted: WeightedReport[] = activeReports.map((report) => ({
    report,
    weight: calculateWeight(report, now, stableGame),
  }));

  // Step 1: Remove statistical outliers (Modified Z-score via MAD)
  weighted = removeOutliers(weighted);

  if (weighted.length === 0) return null;

  // Step 2: Cap AI weight at 30% of total
  weighted = capAiWeight(weighted);

  // Check if any non-AI reports exist (for confidence)
  const hasNonAiReport = weighted.some((w) => !isAiReport(w.report.qualityTier));

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
    confidenceLevel: getConfidence(weighted.length, hasNonAiReport),
    overallVerdict: getVerdict(fpsAvg),
    weightedScore,
    recommendedProfile: null,
  };
}
