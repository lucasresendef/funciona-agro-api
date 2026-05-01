import type { FastifyInstance } from 'fastify';
import { AuthPublicController } from './auth-public.controller';
import { KeycloakAuthService } from './keycloak-auth.service';

export async function authPublicRoutes(app: FastifyInstance): Promise<void> {
  const keycloakAuthService = new KeycloakAuthService();
  const authPublicController = new AuthPublicController(keycloakAuthService);

  app.post('/auth/login', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
    handler: authPublicController.login,
  });

  app.post('/auth/refresh', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: authPublicController.refresh,
  });
}
