import { FieldOperationStatus } from '../../shared/database/prisma-client';
import { z } from 'zod';

export const fieldOperationsCsvQuerySchema = z.object({
  farmId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.nativeEnum(FieldOperationStatus).optional(),
});

export const inventoryMovementsCsvQuerySchema = z.object({
  mode: z.enum(['current', 'filtered', 'all']).default('filtered'),
  farmId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(500).optional(),
});

export const fieldConsumptionReportQuerySchema = z.object({
  fieldId: z.string().uuid(),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const dashboardMetricsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  farmId: z.string().uuid().optional(),
});

export type FieldOperationsCsvQuery = z.infer<typeof fieldOperationsCsvQuerySchema>;
export type InventoryMovementsCsvQuery = z.infer<typeof inventoryMovementsCsvQuerySchema>;
export type FieldConsumptionReportQuery = z.infer<typeof fieldConsumptionReportQuerySchema>;
export type DashboardMetricsQuery = z.infer<typeof dashboardMetricsQuerySchema>;
