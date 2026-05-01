import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3099),
  DATABASE_URL: z.string().min(1),
  KEYCLOAK_PUBLIC_KEY: z.string().trim().min(1).default('test-public-key'),
  KEYCLOAK_URL: z.string().url().default('http://localhost:8181'),
  KEYCLOAK_REALM: z.string().trim().min(1).default('field-management-backend'),
  KEYCLOAK_CLIENT_ID: z.string().trim().min(1).default('field-management-api'),
  ALLOWED_ORIGINS: z.string().trim().optional(),
});

export const env = envSchema.parse(process.env);
