import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listProductsQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    active: optionalQueryBooleanSchema,
    category: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  activeIngredient: z.string().trim().min(1).optional(),
  unitOfMeasureId: z.string().uuid(),
  stockByLocation: z
    .array(
      z.object({
        farmId: z.string().uuid(),
        inventoryLocationId: z.string().uuid(),
        quantity: z.coerce.number().min(0),
        averageUnitCost: z.coerce.number().min(0),
        notes: z.string().trim().min(1).nullable().optional(),
      }),
    )
    .min(1),
});

export const updateProductBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    activeIngredient: z.string().trim().min(1).nullable().optional(),
    unitOfMeasureId: z.string().uuid().optional(),
    stockByLocation: z
      .array(
        z.object({
          farmId: z.string().uuid(),
          inventoryLocationId: z.string().uuid(),
          quantity: z.coerce.number().min(0),
          averageUnitCost: z.coerce.number().min(0),
          notes: z.string().trim().min(1).nullable().optional(),
        }),
      )
      .min(1)
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.code !== undefined ||
      value.category !== undefined ||
      value.description !== undefined ||
      value.activeIngredient !== undefined ||
      value.unitOfMeasureId !== undefined ||
      value.stockByLocation !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
