import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { performanceReports } from '@lib/db/schema';

export type PerformanceReport = InferSelectModel<typeof performanceReports>;
export type NewPerformanceReport = InferInsertModel<typeof performanceReports>;
