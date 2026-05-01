import { z } from 'zod';

const queryBooleanSchema = z.union([
  z.boolean(),
  z.string().transform((value, ctx) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected "true" or "false".',
    });

    return z.NEVER;
  }),
]);

export const optionalQueryBooleanSchema = queryBooleanSchema.optional();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
