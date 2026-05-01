import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listFarmsQuerySchema = z
  .object({
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createFarmBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const updateFarmBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'At least one field must be provided for update.',
  });

export const farmIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListFarmsQuery = z.infer<typeof listFarmsQuerySchema>;
export type CreateFarmBody = z.infer<typeof createFarmBodySchema>;
export type UpdateFarmBody = z.infer<typeof updateFarmBodySchema>;
