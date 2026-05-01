import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listFieldsQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createFieldBodySchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().trim().min(1),
  areaHectares: z.coerce.number().positive(),
  description: z.string().trim().min(1).optional(),
});

export const updateFieldBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    areaHectares: z.coerce.number().positive().optional(),
    description: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.areaHectares !== undefined ||
      value.description !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const fieldIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListFieldsQuery = z.infer<typeof listFieldsQuerySchema>;
export type CreateFieldBody = z.infer<typeof createFieldBodySchema>;
export type UpdateFieldBody = z.infer<typeof updateFieldBodySchema>;
