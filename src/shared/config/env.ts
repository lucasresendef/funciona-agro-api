import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3099),
  DATABASE_URL: z.string().min(1),
  KEYCLOAK_URL: z.string().url().default('http://localhost:8181'),
  KEYCLOAK_REALM: z.string().trim().min(1).default('funciona-agro'),
  KEYCLOAK_CLIENT_ID: z.string().trim().min(1).default('funciona-agro-api'),
  KEYCLOAK_ALLOWED_CLIENT_IDS: z.string().trim().optional(),
  KEYCLOAK_ADMIN_REALM: z.string().trim().min(1).default('master'),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().trim().min(1).default('admin-cli'),
  KEYCLOAK_ADMIN_CLIENT_SECRET: z.string().trim().optional(),
  KEYCLOAK_ADMIN_USERNAME: z.string().trim().optional(),
  KEYCLOAK_ADMIN_PASSWORD: z.string().trim().optional(),
  ALLOWED_ORIGINS: z.string().trim().optional(),
});

export const env = envSchema.parse(process.env);
