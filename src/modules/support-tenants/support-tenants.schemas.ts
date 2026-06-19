import { FarmUserRole } from '@prisma/client';
import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

const tenantKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'Tenant key must use only lowercase letters, numbers and hyphens.');

const supportTenantUserCredentialsSchema = z.object({
  username: z.string().trim().min(3),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const supportTenantFieldSchema = z.object({
  name: z.string().trim().min(1),
  areaHectares: z.coerce.number().positive(),
  description: z.string().trim().min(1).optional(),
});

const supportTenantFarmSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  fields: z.array(supportTenantFieldSchema).optional(),
});

export const createSupportTenantBodySchema = z.object({
  key: tenantKeySchema,
  name: z.string().trim().min(1),
  adminUser: supportTenantUserCredentialsSchema,
  farms: z.array(supportTenantFarmSchema).optional(),
});

export const supportTenantIdParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const supportTenantUserIdParamsSchema = supportTenantIdParamsSchema.extend({
  userId: z.string().uuid(),
});

export const supportTenantFarmIdParamsSchema = supportTenantIdParamsSchema.extend({
  farmId: z.string().uuid(),
});

export const supportTenantFieldIdParamsSchema = supportTenantIdParamsSchema.extend({
  fieldId: z.string().uuid(),
});

export const supportTenantPermissionIdParamsSchema = supportTenantIdParamsSchema.extend({
  permissionId: z.string().uuid(),
});

export const supportCatalogUnitIdParamsSchema = z.object({
  unitId: z.string().uuid(),
});

export const listSupportTenantsQuerySchema = z
  .object({
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const listSupportCatalogUnitsQuerySchema = z
  .object({
    active: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createSupportCatalogUnitBodySchema = z.object({
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).max(20),
});

export const updateSupportCatalogUnitBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    symbol: z.string().trim().min(1).max(20).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.symbol !== undefined || value.active !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const createSupportTenantUserBodySchema = supportTenantUserCredentialsSchema
  .omit({ name: true })
  .extend({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    isAdmin: z.boolean().optional(),
    farmPermissions: z
      .array(
        z.object({
          farmId: z.string().uuid(),
          role: z.nativeEnum(FarmUserRole),
        }),
      )
      .optional(),
  });

export const updateSupportTenantBodySchema = z
  .object({
    key: tenantKeySchema.optional(),
    name: z.string().trim().min(1).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) => value.key !== undefined || value.name !== undefined || value.active !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const updateSupportTenantUserBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    isAdmin: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.isAdmin !== undefined ||
      value.active !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const resetSupportTenantUserPasswordBodySchema = z.object({
  password: z.string().min(8),
});

export const createSupportTenantFarmBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const updateSupportTenantFarmBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.description !== undefined || value.active !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const createSupportTenantFieldBodySchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().trim().min(1),
  areaHectares: z.coerce.number().positive(),
  description: z.string().trim().min(1).optional(),
});

export const updateSupportTenantFieldBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    areaHectares: z.coerce.number().positive().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.areaHectares !== undefined ||
      value.description !== undefined ||
      value.active !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const createSupportTenantPermissionBodySchema = z.object({
  farmId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.nativeEnum(FarmUserRole),
});

export const updateSupportTenantPermissionBodySchema = z
  .object({
    role: z.nativeEnum(FarmUserRole).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.active !== undefined, {
    message: 'At least one field must be provided for update.',
  });

export type CreateSupportTenantBody = z.infer<typeof createSupportTenantBodySchema>;
export type CreateSupportTenantUserBody = z.infer<typeof createSupportTenantUserBodySchema>;
export type UpdateSupportTenantBody = z.infer<typeof updateSupportTenantBodySchema>;
export type UpdateSupportTenantUserBody = z.infer<typeof updateSupportTenantUserBodySchema>;
export type ResetSupportTenantUserPasswordBody = z.infer<
  typeof resetSupportTenantUserPasswordBodySchema
>;
export type CreateSupportTenantFarmBody = z.infer<typeof createSupportTenantFarmBodySchema>;
export type CreateSupportTenantFieldBody = z.infer<typeof createSupportTenantFieldBodySchema>;
export type UpdateSupportTenantFarmBody = z.infer<typeof updateSupportTenantFarmBodySchema>;
export type UpdateSupportTenantFieldBody = z.infer<typeof updateSupportTenantFieldBodySchema>;
export type CreateSupportTenantPermissionBody = z.infer<
  typeof createSupportTenantPermissionBodySchema
>;
export type UpdateSupportTenantPermissionBody = z.infer<
  typeof updateSupportTenantPermissionBodySchema
>;
export type ListSupportTenantsQuery = z.infer<typeof listSupportTenantsQuerySchema>;
export type ListSupportCatalogUnitsQuery = z.infer<typeof listSupportCatalogUnitsQuerySchema>;
export type CreateSupportCatalogUnitBody = z.infer<typeof createSupportCatalogUnitBodySchema>;
export type UpdateSupportCatalogUnitBody = z.infer<typeof updateSupportCatalogUnitBodySchema>;
