import { env } from '../../shared/config/env';
import { AppError } from '../../shared/errors/app-error';

interface KeycloakTokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface DecodedTokenPayload {
  sub?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
}
const KEYCLOAK_FETCH_TIMEOUT_MS = 8_000;

function getRealmBaseUrl(): string {
  const base = env.KEYCLOAK_URL.replace(/\/+$/, '');
  const realm = encodeURIComponent(env.KEYCLOAK_REALM);
  return `${base}/realms/${realm}`;
}

export interface AuthenticatedTokenUser {
  sub: string | null;
  name: string | null;
  email: string | null;
  preferredUsername: string | null;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
  tokenType: string | null;
  scope: string | null;
  user: AuthenticatedTokenUser;
}

function decodeTokenPayload(token: string): DecodedTokenPayload | null {
  const segments = token.split('.');

  if (segments.length !== 3) {
    return null;
  }

  const encodedPayload = segments[1];
  const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  try {
    const payload = JSON.parse(
      Buffer.from(`${normalized}${padding}`, 'base64').toString('utf-8'),
    ) as DecodedTokenPayload;

    return payload;
  } catch {
    return null;
  }
}

function buildAuthenticatedUser(idToken: string): AuthenticatedTokenUser {
  const payload = decodeTokenPayload(idToken);

  if (!payload?.sub) {
    throw new AppError(502, 'Keycloak id token is invalid or does not contain user subject.');
  }

  return {
    sub: payload.sub,
    name: payload.name ?? payload.preferred_username ?? null,
    email: payload.email ?? null,
    preferredUsername: payload.preferred_username ?? null,
  };
}

function mapTokenResponse(payload: KeycloakTokenResponse): AuthTokens {
  if (!payload.access_token) {
    throw new AppError(502, 'Keycloak token response does not contain access token.');
  }

  if (!payload.id_token) {
    throw new AppError(
      502,
      'Keycloak token response does not contain id token. Prefer authorization code + PKCE (/auth/exchange-code).',
    );
  }

  return {
    accessToken: payload.access_token,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token ?? null,
    expiresIn: payload.expires_in ?? null,
    refreshExpiresIn: payload.refresh_expires_in ?? null,
    tokenType: payload.token_type ?? null,
    scope: payload.scope ?? null,
    user: buildAuthenticatedUser(payload.id_token),
  };
}

export class KeycloakAuthService {
  async login(input: { username: string; password: string }): Promise<AuthTokens> {
    const params = new URLSearchParams();
    params.append('client_id', env.KEYCLOAK_CLIENT_ID);
    params.append('grant_type', 'password');
    params.append('username', input.username);
    params.append('password', input.password);
    params.append('scope', 'openid profile email');

    const payload = await this.requestToken(params);

    return mapTokenResponse(payload);
  }

  async refresh(input: { refreshToken: string }): Promise<AuthTokens> {
    const params = new URLSearchParams();
    params.append('client_id', env.KEYCLOAK_CLIENT_ID);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', input.refreshToken);
    params.append('scope', 'openid profile email');

    const payload = await this.requestToken(params);

    return mapTokenResponse(payload);
  }

  private async requestToken(params: URLSearchParams): Promise<KeycloakTokenResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KEYCLOAK_FETCH_TIMEOUT_MS);
    const response = await fetch(`${getRealmBaseUrl()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    }).catch(() => {
      throw new AppError(503, 'Unable to reach Keycloak token endpoint.');
    }).finally(() => {
      clearTimeout(timeout);
    });

    const payload = (await response.json().catch(() => null)) as KeycloakTokenResponse | null;

    if (!response.ok || !payload) {
      throw new AppError(401, 'Authentication failed with Keycloak.');
    }

    if (payload.error) {
      throw new AppError(401, payload.error_description ?? 'Authentication failed with Keycloak.');
    }

    return payload;
  }
}
