import { createPublicKey, verify } from 'node:crypto';
import { env } from '../../shared/config/env';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser, JwtHeader, JwtPayload } from './auth.types';

const ALLOWED_ALGORITHM = 'RS256';
const CLOCK_TOLERANCE_SECONDS = 5;
const allowedClientIds = new Set(
  [env.KEYCLOAK_CLIENT_ID, ...(env.KEYCLOAK_ALLOWED_CLIENT_IDS?.split(',') ?? [])]
    .map((clientId) => clientId.trim())
    .filter(Boolean),
);

function decodeBase64UrlSegment<T>(value: string): T {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  return JSON.parse(Buffer.from(`${normalized}${padding}`, 'base64').toString('utf-8')) as T;
}

function decodeBase64UrlBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function getRealmIssuerUrl(): string {
  const base = env.KEYCLOAK_URL.replace(/\/+$/, '');
  const realm = encodeURIComponent(env.KEYCLOAK_REALM);
  return `${base}/realms/${realm}`;
}

function buildPemPublicKey(publicKeyBase64: string): string {
  const chunks = publicKeyBase64.match(/.{1,64}/g) ?? [publicKeyBase64];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
}

function validateClaims(payload: JwtPayload): void {
  const now = Math.floor(Date.now() / 1000);
  const realmRoles = payload.realm_access?.roles ?? [];
  const isGlobalSupportAdmin = realmRoles.includes('support-admin');

  if (!payload.sub) {
    throw new AppError(401, 'Bearer token does not contain subject.');
  }

  if (!payload.tenant_id && !payload.tenantId && !isGlobalSupportAdmin) {
    throw new AppError(401, 'Bearer token does not contain tenant identifier.');
  }

  if (payload.iss !== getRealmIssuerUrl()) {
    throw new AppError(401, 'Bearer token has invalid issuer.');
  }

  if (!payload.azp || !allowedClientIds.has(payload.azp)) {
    throw new AppError(401, 'Bearer token has invalid authorized party.');
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  const hasAllowedAudience = audiences.some((audience) => allowedClientIds.has(audience));
  if (audiences.length > 0 && !hasAllowedAudience && !audiences.includes('account')) {
    throw new AppError(401, 'Bearer token has invalid audience.');
  }

  if (!payload.exp || payload.exp <= now - CLOCK_TOLERANCE_SECONDS) {
    throw new AppError(401, 'Bearer token has expired.');
  }

  if (payload.nbf && payload.nbf > now + CLOCK_TOLERANCE_SECONDS) {
    throw new AppError(401, 'Bearer token is not active yet.');
  }
}

export class KeycloakJwtService {
  private readonly publicKey = createPublicKey({
    key: buildPemPublicKey(env.KEYCLOAK_PUBLIC_KEY),
    format: 'pem',
  });

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const segments = token.split('.');

    if (segments.length !== 3) {
      throw new AppError(401, 'Invalid bearer token.');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    let header: JwtHeader;
    let payload: JwtPayload;
    try {
      header = decodeBase64UrlSegment<JwtHeader>(encodedHeader);
      payload = decodeBase64UrlSegment<JwtPayload>(encodedPayload);
    } catch {
      throw new AppError(401, 'Invalid bearer token.');
    }

    if (header.alg !== ALLOWED_ALGORITHM) {
      throw new AppError(401, `Unsupported bearer token algorithm: ${header.alg ?? 'unknown'}.`);
    }

    validateClaims(payload);

    const signature = decodeBase64UrlBuffer(encodedSignature);
    const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const isValid = verify('RSA-SHA256', signingInput, this.publicKey, signature);

    if (!isValid) {
      throw new AppError(401, 'Bearer token signature verification failed.');
    }

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
