import { env } from '../../shared/config/env';
import { AppError } from '../../shared/errors/app-error';

interface KeycloakTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface KeycloakRoleRepresentation {
  id: string;
  name: string;
}

interface KeycloakUserRepresentation {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
}

interface CreateKeycloakUserInput {
  username: string;
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  temporaryPassword?: boolean;
  tenantId: string;
  tenantKey: string;
  realmRoles?: string[];
}

interface UpdateKeycloakUserInput {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  enabled?: boolean;
  tenantId?: string;
  tenantKey?: string;
}

const KEYCLOAK_FETCH_TIMEOUT_MS = 8_000;

function getRealmTokenUrl(realm: string): string {
  const base = env.KEYCLOAK_URL.replace(/\/+$/, '');
  return `${base}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;
}

function getRealmAdminBaseUrl(): string {
  const base = env.KEYCLOAK_URL.replace(/\/+$/, '');
  return `${base}/admin/realms/${encodeURIComponent(env.KEYCLOAK_REALM)}`;
}

function parseUserIdFromLocationHeader(location: string | null): string | null {
  if (!location) {
    return null;
  }

  const segments = location.split('/');
  const id = segments[segments.length - 1]?.trim();
  return id || null;
}

export class KeycloakAdminService {
  async createUser(input: CreateKeycloakUserInput): Promise<{ id: string }> {
    const token = await this.getAdminAccessToken();
    const adminBaseUrl = getRealmAdminBaseUrl();

    const createResponse = await this.request(`${adminBaseUrl}/users`, {
      method: 'POST',
      token,
      body: {
        username: input.username,
        email: input.email,
        enabled: true,
        emailVerified: true,
        requiredActions: input.temporaryPassword ? ['UPDATE_PASSWORD'] : [],
        attributes: {
          tenant_id: [input.tenantId],
          tenantId: [input.tenantId],
          tenant_key: [input.tenantKey],
        },
        credentials: [
          {
            type: 'password',
            value: input.password,
            temporary: input.temporaryPassword ?? false,
          },
        ],
        firstName: input.firstName,
        lastName: input.lastName ?? '',
      },
      acceptedStatuses: [201, 409],
    });

    if (createResponse.status === 409) {
      throw new AppError(409, 'A Keycloak user with the same username or email already exists.');
    }

    let userId = parseUserIdFromLocationHeader(createResponse.headers.get('location'));

    if (!userId) {
      userId = await this.findUserIdByUsername(input.username, token);
    }

    if (!userId) {
      throw new AppError(502, 'Unable to determine created Keycloak user identifier.');
    }

    if (input.realmRoles && input.realmRoles.length > 0) {
      await this.assignRealmRoles(userId, input.realmRoles, token);
    }

    return { id: userId };
  }

  async deleteUserById(id: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    const adminBaseUrl = getRealmAdminBaseUrl();
    await this.request(`${adminBaseUrl}/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token,
      acceptedStatuses: [204, 404],
    });
  }

  async getUserById(id: string): Promise<KeycloakUserRepresentation | null> {
    const token = await this.getAdminAccessToken();
    return this.fetchUserById(id, token);
  }

  async updateUser(input: UpdateKeycloakUserInput): Promise<void> {
    const token = await this.getAdminAccessToken();
    const adminBaseUrl = getRealmAdminBaseUrl();
    const currentUser = await this.fetchUserById(input.id, token);

    if (!currentUser) {
      throw new AppError(404, 'Keycloak user not found.');
    }

    const attributes = {
      ...(currentUser.attributes ?? {}),
      ...(input.tenantId
        ? {
            tenant_id: [input.tenantId],
            tenantId: [input.tenantId],
          }
        : {}),
      ...(input.tenantKey
        ? {
            tenant_key: [input.tenantKey],
          }
        : {}),
    };

    await this.request(`${adminBaseUrl}/users/${encodeURIComponent(input.id)}`, {
      method: 'PUT',
      token,
      body: {
        username: input.username ?? currentUser.username,
        email: input.email ?? currentUser.email,
        enabled: input.enabled ?? currentUser.enabled ?? true,
        emailVerified: true,
        firstName: input.name ?? currentUser.firstName ?? '',
        lastName: currentUser.lastName ?? '',
        attributes,
      },
      acceptedStatuses: [204],
    });
  }

  async setRealmRole(userId: string, roleName: string, enabled: boolean): Promise<void> {
    const token = await this.getAdminAccessToken();
    const roleRepresentation = await this.getRoleRepresentation(roleName, token);
    const currentRoles = await this.getUserRealmRoles(userId, token);
    const hasRole = currentRoles.some((role) => role.name === roleName);

    if (enabled && !hasRole) {
      await this.assignRealmRoles(userId, [roleName], token);
      return;
    }

    if (!enabled && hasRole) {
      await this.request(
        `${getRealmAdminBaseUrl()}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
        {
          method: 'DELETE',
          token,
          body: [roleRepresentation],
          acceptedStatuses: [204],
        },
      );
    }
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    const adminBaseUrl = getRealmAdminBaseUrl();

    await this.request(`${adminBaseUrl}/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'PUT',
      token,
      body: {
        type: 'password',
        value: password,
        temporary: false,
      },
      acceptedStatuses: [204],
    });
  }

  private async findUserIdByUsername(
    username: string,
    token: string,
  ): Promise<string | null> {
    const adminBaseUrl = getRealmAdminBaseUrl();
    const encodedUsername = encodeURIComponent(username);
    const response = await this.request(
      `${adminBaseUrl}/users?username=${encodedUsername}&exact=true&max=1`,
      {
        method: 'GET',
        token,
      },
    );

    const users = (await response.json().catch(() => [])) as KeycloakUserRepresentation[];
    return users[0]?.id ?? null;
  }

  private async fetchUserById(
    userId: string,
    token: string,
  ): Promise<KeycloakUserRepresentation | null> {
    const adminBaseUrl = getRealmAdminBaseUrl();
    const response = await this.request(`${adminBaseUrl}/users/${encodeURIComponent(userId)}`, {
      method: 'GET',
      token,
      acceptedStatuses: [200, 404],
    });

    if (response.status === 404) {
      return null;
    }

    return (await response.json().catch(() => null)) as KeycloakUserRepresentation | null;
  }

  private async getRoleRepresentation(
    roleName: string,
    token: string,
  ): Promise<KeycloakRoleRepresentation> {
    const adminBaseUrl = getRealmAdminBaseUrl();
    const encodedRoleName = encodeURIComponent(roleName);
    const roleResponse = await this.request(`${adminBaseUrl}/roles/${encodedRoleName}`, {
      method: 'GET',
      token,
    });
    const rolePayload = (await roleResponse.json().catch(() => null)) as
      | KeycloakRoleRepresentation
      | null;

    if (!rolePayload?.id || !rolePayload.name) {
      throw new AppError(502, `Unable to resolve Keycloak role "${roleName}".`);
    }

    return rolePayload;
  }

  private async getUserRealmRoles(
    userId: string,
    token: string,
  ): Promise<KeycloakRoleRepresentation[]> {
    const adminBaseUrl = getRealmAdminBaseUrl();
    const response = await this.request(
      `${adminBaseUrl}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'GET',
        token,
      },
    );

    return (await response.json().catch(() => [])) as KeycloakRoleRepresentation[];
  }

  private async assignRealmRoles(userId: string, roleNames: string[], token: string): Promise<void> {
    const roleRepresentations: KeycloakRoleRepresentation[] = [];

    for (const roleName of roleNames) {
      const rolePayload = await this.getRoleRepresentation(roleName, token);
      roleRepresentations.push(rolePayload);
    }

    await this.request(
      `${getRealmAdminBaseUrl()}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'POST',
        token,
        body: roleRepresentations,
        acceptedStatuses: [204],
      },
    );
  }

  private async getAdminAccessToken(): Promise<string> {
    const tokenUrl = getRealmTokenUrl(env.KEYCLOAK_ADMIN_REALM);
    const params = new URLSearchParams();

    params.append('client_id', env.KEYCLOAK_ADMIN_CLIENT_ID);

    if (env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      params.append('client_secret', env.KEYCLOAK_ADMIN_CLIENT_SECRET);
      params.append('grant_type', 'client_credentials');
    } else {
      if (!env.KEYCLOAK_ADMIN_USERNAME || !env.KEYCLOAK_ADMIN_PASSWORD) {
        throw new AppError(
          500,
          'Missing Keycloak admin credentials. Configure KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD.',
        );
      }
      params.append('grant_type', 'password');
      params.append('username', env.KEYCLOAK_ADMIN_USERNAME);
      params.append('password', env.KEYCLOAK_ADMIN_PASSWORD);
    }

    const response = await this.request(tokenUrl, {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      body: params.toString(),
      token: null,
      acceptedStatuses: [200],
    });

    const payload = (await response.json().catch(() => null)) as KeycloakTokenResponse | null;
    if (!payload?.access_token) {
      throw new AppError(502, 'Keycloak admin token response does not contain access token.');
    }
    if (payload.error) {
      throw new AppError(502, payload.error_description ?? 'Keycloak admin authentication failed.');
    }

    return payload.access_token;
  }

  private async request(
    url: string,
    input: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      token: string | null;
      body?: unknown;
      contentType?: string;
      acceptedStatuses?: number[];
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KEYCLOAK_FETCH_TIMEOUT_MS);

    const headers: Record<string, string> = {};

    if (input.token) {
      headers.Authorization = `Bearer ${input.token}`;
    }

    if (input.contentType) {
      headers['Content-Type'] = input.contentType;
    } else if (input.body !== undefined && typeof input.body !== 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: input.method,
      headers,
      body:
        input.body === undefined
          ? undefined
          : typeof input.body === 'string'
            ? input.body
            : JSON.stringify(input.body),
      signal: controller.signal,
    }).catch(() => {
      throw new AppError(503, 'Unable to reach Keycloak admin endpoint.');
    }).finally(() => {
      clearTimeout(timeout);
    });

    const acceptedStatuses = input.acceptedStatuses ?? [200];
    if (!acceptedStatuses.includes(response.status)) {
      const payloadText = await response.text().catch(() => '');
      throw new AppError(502, 'Keycloak admin request failed.', {
        status: response.status,
        payload: payloadText || null,
      });
    }

    return response;
  }
}
