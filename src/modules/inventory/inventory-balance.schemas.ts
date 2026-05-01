import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listInventoryBalanceQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    inventoryLocationId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    active: optionalQueryBooleanSchema,
  })
  .merge(paginationQuerySchema);

export const createInventoryBalanceBodySchema = z.object({
  farmId: z.string().uuid(),
  inventoryLocationId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.coerce.number().min(0),
  averageUnitCost: z.coerce.number().min(0),
  occurredAt: z.coerce.date().optional(),
  notes: z.string().trim().min(1).optional(),
});

export const updateInventoryBalanceBodySchema = z
  .object({
    quantity: z.coerce.number().min(0).optional(),
    averageUnitCost: z.coerce.number().min(0).optional(),
    occurredAt: z.coerce.date().optional(),
    notes: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.quantity !== undefined ||
      value.averageUnitCost !== undefined ||
      value.occurredAt !== undefined ||
      value.notes !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const inventoryBalanceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListInventoryBalanceQuery = z.infer<typeof listInventoryBalanceQuerySchema>;
export type CreateInventoryBalanceBody = z.infer<typeof createInventoryBalanceBodySchema>;
export type UpdateInventoryBalanceBody = z.infer<typeof updateInventoryBalanceBodySchema>;
