import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../../shared/config/env';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

const ALLOWED_ALGORITHM = 'RS256';
const CLOCK_TOLERANCE_SECONDS = 5;
const allowedClientIds = new Set(
  [env.KEYCLOAK_CLIENT_ID, ...(env.KEYCLOAK_ALLOWED_CLIENT_IDS?.split(',') ?? [])]
    .map((clientId) => clientId.trim())
    .filter(Boolean),
);

function getRealmIssuerUrl(): string {
  const base = env.KEYCLOAK_URL.replace(/\/+$/, '');
  const realm = encodeURIComponent(env.KEYCLOAK_REALM);
  return `${base}/realms/${realm}`;
}

function getJwksUri(): string {
  return `${getRealmIssuerUrl()}/protocol/openid-connect/certs`;
}

function validateClaims(payload: JwtPayload): void {
  const realmRoles = payload.realm_access?.roles ?? [];
  const isGlobalSupportAdmin = realmRoles.includes('support-admin');

  if (!payload.sub) {
    throw new AppError(401, 'Bearer token does not contain subject.');
  }

  if (!payload.tenant_id && !payload.tenantId && !isGlobalSupportAdmin) {
    throw new AppError(401, 'Bearer token does not contain tenant identifier.');
  }

  if (!payload.azp || !allowedClientIds.has(payload.azp)) {
    throw new AppError(401, 'Bearer token has invalid authorized party.');
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (
    audiences.length > 0 &&
    !audiences.some((audience) => allowedClientIds.has(audience)) &&
    !audiences.includes('account')
  ) {
    throw new AppError(401, 'Bearer token has invalid audience.');
  }
}

export class KeycloakJwtService {
  private readonly jwks = createRemoteJWKSet(new URL(getJwksUri()));

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    let payload: JwtPayload;
    try {
      const result = await jwtVerify(token, this.jwks, {
        algorithms: [ALLOWED_ALGORITHM],
        issuer: getRealmIssuerUrl(),
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      payload = result.payload as unknown as JwtPayload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, 'Invalid bearer token.');
    }

    validateClaims(payload);

    return {
      sub: payload.sub!,
      tenantId: payload.tenant_id ?? payload.tenantId ?? '',
      name: payload.name ?? payload.preferred_username ?? null,
      email: payload.email ?? null,
      preferredUsername: payload.preferred_username ?? null,
      scope: payload.scope ?? null,
      realmRoles: payload.realm_access?.roles ?? [],
      resourceRoles: payload.resource_access ?? {},
    };
  }
}
