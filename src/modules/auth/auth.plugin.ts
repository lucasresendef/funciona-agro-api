import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser } from './auth.types';
import { KeycloakJwtService } from './keycloak-jwt.service';

const BEARER_PREFIX = 'Bearer ';

function getBearerToken(headerValue?: string): string | null {
  if (!headerValue) {
    return null;
  }

  if (!headerValue.startsWith(BEARER_PREFIX)) {
    throw new AppError(401, 'Authorization header must use Bearer token.');
  }

  return headerValue.slice(BEARER_PREFIX.length).trim() || null;
}

async function extractAuthenticatedUser(
  request: FastifyRequest,
  keycloakJwtService: KeycloakJwtService,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    return null;
  }

  return keycloakJwtService.verifyAccessToken(token);
}

export function registerAuth(app: FastifyInstance): void {
  const keycloakJwtService = new KeycloakJwtService();

  app.decorateRequest('authUser', null);

  app.addHook('onRequest', async (request) => {
    request.authUser = await extractAuthenticatedUser(request, keycloakJwtService);
  });
}

export async function ensureAuthenticated(request: FastifyRequest): Promise<void> {
  if (!request.authUser) {
    throw new AppError(401, 'Authentication required.');
  }
}

export function isAppAdmin(request: FastifyRequest): boolean {
  return request.authUser?.realmRoles.includes('app-admin') ?? false;
}

export async function ensureAppAdmin(request: FastifyRequest): Promise<void> {
  await ensureAuthenticated(request);

  if (!isAppAdmin(request)) {
    throw new AppError(403, 'Admin role required.');
  }
}
