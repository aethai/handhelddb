import type { InferSelectModel } from 'drizzle-orm';
import type { users } from '@lib/db/schema';

export type User = InferSelectModel<typeof users>;

export type UserLevel =
  | 'new_tester'
  | 'contributor'
  | 'veteran'
  | 'expert'
  | 'elite';

export const USER_LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  new_tester: 0,
  contributor: 50,
  veteran: 200,
  expert: 500,
  elite: 1000,
};

export const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  new_tester: 'New Tester',
  contributor: 'Contributor',
  veteran: 'Veteran Tester',
  expert: 'Expert Tester',
  elite: 'Elite Tester',
};

export function getUserLevel(points: number): UserLevel {
  if (points >= 1000) return 'elite';
  if (points >= 500) return 'expert';
  if (points >= 200) return 'veteran';
  if (points >= 50) return 'contributor';
  return 'new_tester';
}
