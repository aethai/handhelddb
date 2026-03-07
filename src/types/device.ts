import type { InferSelectModel } from 'drizzle-orm';
import type { devices } from '@lib/db/schema';

export type Device = InferSelectModel<typeof devices>;

export interface DeviceStats {
  totalTestedGames: number;
  gamesAt60fps: number;
  gamesAt40fps: number;
  gamesAt30fps: number;
  avgBatteryLife: number;
}
