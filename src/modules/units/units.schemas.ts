import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listUnitsQuerySchema = z
  .object({
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createUnitBodySchema = z.object({
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).max(20),
});

export const updateUnitBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    symbol: z.string().trim().min(1).max(20).optional(),
  })
  .refine((value) => value.name !== undefined || value.symbol !== undefined, {
    message: 'At least one field must be provided for update.',
  });

export const unitIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;
export type CreateUnitBody = z.infer<typeof createUnitBodySchema>;
export type UpdateUnitBody = z.infer<typeof updateUnitBodySchema>;
