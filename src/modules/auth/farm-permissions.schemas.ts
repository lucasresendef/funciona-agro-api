import { FarmUserRole } from '@prisma/client';
import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listFarmPermissionsQuerySchema = z
  .object({
    farmId: z.string().uuid().optional(),
    keycloakUserId: z.string().trim().min(1).optional(),
    role: z.nativeEnum(FarmUserRole).optional(),
    active: optionalQueryBooleanSchema,
  })
  .merge(paginationQuerySchema);

export const createFarmPermissionBodySchema = z.object({
  farmId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.nativeEnum(FarmUserRole),
});

export const updateFarmPermissionBodySchema = z
  .object({
    role: z.nativeEnum(FarmUserRole).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.active !== undefined, {
    message: 'At least one field must be provided for update.',
  });

export const farmPermissionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListFarmPermissionsQuery = z.infer<typeof listFarmPermissionsQuerySchema>;
export type CreateFarmPermissionBody = z.infer<typeof createFarmPermissionBodySchema>;
export type UpdateFarmPermissionBody = z.infer<typeof updateFarmPermissionBodySchema>;
