import { FieldOperationStatus } from '@prisma/client';
import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listFieldOperationsQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    fieldId: z.string().uuid().optional(),
    inventoryLocationId: z.string().uuid().optional(),
    status: z.nativeEnum(FieldOperationStatus).optional(),
    active: optionalQueryBooleanSchema,
  })
  .merge(paginationQuerySchema);

export const createFieldOperationItemBodySchema = z.object({
  productId: z.string().uuid(),
  quantitySent: z.coerce.number().positive(),
  quantityReturned: z.coerce.number().min(0).optional(),
  quantityConsumed: z.coerce.number().min(0).optional(),
  unitCostAtOperation: z.coerce.number().min(0),
  notes: z.string().trim().min(1).nullable().optional(),
});

export const createFieldOperationBodySchema = z.object({
  farmId: z.string().uuid(),
  fieldId: z.string().uuid(),
  inventoryLocationId: z.string().uuid(),
  operationDate: z.coerce.date(),
  status: z.nativeEnum(FieldOperationStatus).optional(),
  description: z.string().trim().min(1).nullable().optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  items: z.array(createFieldOperationItemBodySchema).min(1),
});

export const updateFieldOperationItemBodySchema = z.object({
  id: z.string().uuid(),
  quantityReturned: z.coerce.number().min(0).optional(),
  quantityConsumed: z.coerce.number().min(0).optional(),
  notes: z.string().trim().min(1).nullable().optional(),
});

export const updateFieldOperationBodySchema = z
  .object({
    operationDate: z.coerce.date().optional(),
    status: z.nativeEnum(FieldOperationStatus).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    startedAt: z.coerce.date().nullable().optional(),
    finishedAt: z.coerce.date().nullable().optional(),
    items: z.array(updateFieldOperationItemBodySchema).optional(),
  })
  .refine(
    (value) =>
      value.operationDate !== undefined ||
      value.status !== undefined ||
      value.description !== undefined ||
      value.startedAt !== undefined ||
      value.finishedAt !== undefined ||
      value.items !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const fieldOperationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListFieldOperationsQuery = z.infer<typeof listFieldOperationsQuerySchema>;
export type CreateFieldOperationBody = z.infer<typeof createFieldOperationBodySchema>;
export type CreateFieldOperationItemBody = z.infer<typeof createFieldOperationItemBodySchema>;
export type UpdateFieldOperationBody = z.infer<typeof updateFieldOperationBodySchema>;
