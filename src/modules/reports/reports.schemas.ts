import { z } from 'zod';

export const createInventoryMovementsReportBodySchema = z.object({
  farmId: z.string().uuid(),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const reportJobIdParamsSchema = z.object({
  jobId: z.string().uuid(),
});

export type CreateInventoryMovementsReportBody = z.infer<
  typeof createInventoryMovementsReportBodySchema
>;
