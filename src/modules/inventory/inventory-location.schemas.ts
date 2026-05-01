import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listInventoryLocationsQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createInventoryLocationBodySchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const updateInventoryLocationBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'At least one field must be provided for update.',
  });

export const inventoryLocationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListInventoryLocationsQuery = z.infer<typeof listInventoryLocationsQuerySchema>;
export type CreateInventoryLocationBody = z.infer<typeof createInventoryLocationBodySchema>;
export type UpdateInventoryLocationBody = z.infer<typeof updateInventoryLocationBodySchema>;
