import { z } from 'zod';
import { optionalQueryBooleanSchema, paginationQuerySchema } from '../../shared/utils/zod';

export const listUsersQuerySchema = z
  .object({
    active: optionalQueryBooleanSchema,
    isAdmin: optionalQueryBooleanSchema,
    search: z.string().trim().min(1).optional(),
  })
  .merge(paginationQuerySchema);

export const createUserBodySchema = z.object({
  keycloakUserId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  isAdmin: z.boolean().optional(),
});

export const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    isAdmin: z.boolean().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.email !== undefined || value.isAdmin !== undefined,
    {
      message: 'At least one field must be provided for update.',
    },
  );

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
