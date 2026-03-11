import { describe, it, expect } from 'vitest';
import { calculateConsensus, type ConsensusResult } from '@/lib/consensus';

function createReport(overrides: Partial<Parameters<typeof calculateConsensus>[0][0]> = {}) {
  return {
    fpsAvg: 60,
    fpsLow: 45,
    preset: 'medium',
    resolution: '1280x800',
    tdpLimitWatts: 15,
    batteryLifeHours: 2.5,
    thermal: 'warm',
    fanNoise: 'moderate',
    qualityTier: 'community_confirmed',
    upvotes: 5,
    downvotes: 1,
    createdAt: new Date(),
    isFlagged: false,
    isStale: false,
    fsrEnabled: false,
    fsrMode: null,
    customSettings: null,
    ...overrides,
  };
}

describe('calculateConsensus', () => {
  it('returns null for empty reports array', () => {
    expect(calculateConsensus([])).toBeNull();
  });

  it('returns null when all reports are flagged', () => {
    const reports = [
      createReport({ isFlagged: true }),
      createReport({ isFlagged: true }),
    ];
    expect(calculateConsensus(reports)).toBeNull();
  });

  it('returns null when all reports are stale', () => {
    const reports = [
      createReport({ isStale: true }),
      createReport({ isStale: true }),
    ];
    expect(calculateConsensus(reports)).toBeNull();
  });

  it('returns a valid consensus result for a single report', () => {
    const reports = [createReport({ fpsAvg: 45 })];
    const result = calculateConsensus(reports);

    expect(result).not.toBeNull();
    expect(result!.fpsAvg).toBe(45);
    expect(result!.reportCount).toBe(1);
  });

  it('calculates correct report count excluding flagged/stale', () => {
    const reports = [
      createReport(),
      createReport({ isFlagged: true }),
      createReport({ isStale: true }),
      createReport(),
    ];
    const result = calculateConsensus(reports);

    expect(result).not.toBeNull();
    expect(result!.reportCount).toBe(2);
  });

  it('returns "low" confidence for fewer than 3 reports', () => {
    const reports = [createReport(), createReport()];
    const result = calculateConsensus(reports);
    expect(result!.confidenceLevel).toBe('low');
  });

  it('returns "medium" confidence for 3-10 reports', () => {
    const reports = Array.from({ length: 5 }, () => createReport());
    const result = calculateConsensus(reports);
    expect(result!.confidenceLevel).toBe('medium');
  });

  it('returns "high" confidence for more than 10 reports', () => {
    const reports = Array.from({ length: 11 }, () => createReport());
    const result = calculateConsensus(reports);
    expect(result!.confidenceLevel).toBe('high');
  });

  it('returns "excellent" verdict for 60+ fps', () => {
    const reports = [createReport({ fpsAvg: 60 })];
    const result = calculateConsensus(reports);
    expect(result!.overallVerdict).toBe('excellent');
  });

  it('returns "good" verdict for 40-59 fps', () => {
    const reports = [createReport({ fpsAvg: 45 })];
    const result = calculateConsensus(reports);
    expect(result!.overallVerdict).toBe('good');
  });

  it('returns "fair" verdict for 30-39 fps', () => {
    const reports = [createReport({ fpsAvg: 30 })];
    const result = calculateConsensus(reports);
    expect(result!.overallVerdict).toBe('fair');
  });

  it('returns "poor" verdict for 20-29 fps', () => {
    const reports = [createReport({ fpsAvg: 25 })];
    const result = calculateConsensus(reports);
    expect(result!.overallVerdict).toBe('poor');
  });

  it('returns "unplayable" verdict for under 20 fps', () => {
    const reports = [createReport({ fpsAvg: 15 })];
    const result = calculateConsensus(reports);
    expect(result!.overallVerdict).toBe('unplayable');
  });

  it('calculates weighted median fps from multiple reports', () => {
    const reports = [
      createReport({ fpsAvg: 30 }),
      createReport({ fpsAvg: 60 }),
      createReport({ fpsAvg: 45 }),
    ];
    const result = calculateConsensus(reports);
    expect(result).not.toBeNull();
    // The median should be one of the values (weighted)
    expect(result!.fpsAvg).toBeGreaterThanOrEqual(30);
    expect(result!.fpsAvg).toBeLessThanOrEqual(60);
  });

  it('determines recommended preset via weighted mode', () => {
    const reports = [
      createReport({ preset: 'low' }),
      createReport({ preset: 'medium' }),
      createReport({ preset: 'medium' }),
      createReport({ preset: 'high' }),
    ];
    const result = calculateConsensus(reports);
    // Medium should win as it appears most frequently
    expect(result!.recommendedPreset).toBe('medium');
  });

  it('handles reports with null optional fields', () => {
    const reports = [
      createReport({
        fpsLow: null,
        preset: null,
        resolution: null,
        tdpLimitWatts: null,
        batteryLifeHours: null,
        thermal: null,
        fanNoise: null,
      }),
    ];
    const result = calculateConsensus(reports);
    expect(result).not.toBeNull();
    expect(result!.fpsLow).toBeNull();
    expect(result!.recommendedPreset).toBeNull();
    expect(result!.recommendedResolution).toBeNull();
    expect(result!.recommendedTdp).toBeNull();
    expect(result!.estimatedBattery).toBeNull();
    expect(result!.typicalThermal).toBeNull();
    expect(result!.typicalFanNoise).toBeNull();
  });

  it('weighs verified reports higher than community confirmed', () => {
    const reports = [
      createReport({ fpsAvg: 30, qualityTier: 'verified', upvotes: 0, downvotes: 0 }),
      createReport({ fpsAvg: 60, qualityTier: 'reported', upvotes: 0, downvotes: 0 }),
    ];
    const result = calculateConsensus(reports);
    // Verified (weight 5.0) vs reported (weight 1.0)
    // The weighted score should lean toward 30fps
    expect(result!.weightedScore).toBeLessThan(50);
  });

  it('includes recommendedProfile as null (calculated separately)', () => {
    const reports = [createReport()];
    const result = calculateConsensus(reports);
    expect(result!.recommendedProfile).toBeNull();
  });

  it('produces a positive weighted score', () => {
    const reports = [createReport({ fpsAvg: 60 })];
    const result = calculateConsensus(reports);
    expect(result!.weightedScore).toBeGreaterThan(0);
  });
});
