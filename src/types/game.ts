import type { InferSelectModel } from 'drizzle-orm';
import type { games, consensusRatings } from '@lib/db/schema';

export type Game = InferSelectModel<typeof games>;

export type ConsensusRating = InferSelectModel<typeof consensusRatings>;

export interface GameWithConsensus extends Game {
  consensus: Record<string, ConsensusRating>;
}

export type PerformanceTier =
  | 'lightweight'
  | 'medium'
  | 'demanding'
  | 'very_demanding';

export type FPSVerdict = 'excellent' | 'good' | 'fair' | 'poor' | 'unplayable';

export function getFPSVerdict(fps: number): FPSVerdict {
  if (fps >= 60) return 'excellent';
  if (fps >= 40) return 'good';
  if (fps >= 30) return 'fair';
  if (fps >= 20) return 'poor';
  return 'unplayable';
}

export function getVerdictColor(verdict: FPSVerdict): string {
  switch (verdict) {
    case 'excellent':
      return 'text-green-500';
    case 'good':
      return 'text-[#D4A574]';
    case 'fair':
      return 'text-yellow-500';
    case 'poor':
      return 'text-orange-500';
    case 'unplayable':
      return 'text-red-500';
  }
}

export function getVerdictBgColor(verdict: FPSVerdict): string {
  switch (verdict) {
    case 'excellent':
      return 'bg-green-500/20';
    case 'good':
      return 'bg-[#D4A574]/20';
    case 'fair':
      return 'bg-yellow-500/20';
    case 'poor':
      return 'bg-orange-500/20';
    case 'unplayable':
      return 'bg-red-500/20';
  }
}
