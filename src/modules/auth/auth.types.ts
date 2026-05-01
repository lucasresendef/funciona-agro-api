export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  name: string | null;
  email: string | null;
  preferredUsername: string | null;
  scope: string | null;
  realmRoles: string[];
  resourceRoles: Record<string, { roles?: string[] }>;
}

export interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

export interface JwtPayload {
  sub?: string;
  tenant_id?: string;
  tenantId?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  scope?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  azp?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
}
