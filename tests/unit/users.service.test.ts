import assert from 'node:assert/strict';
import test from 'node:test';
import { UsersService } from '../../src/modules/users/users.service';
import { AppError } from '../../src/shared/errors/app-error';

const authUser = {
  sub: 'kc-admin',
  tenantId: 'tenant-1',
  name: 'Admin',
  email: 'admin@test.com',
  preferredUsername: 'admin',
  scope: null,
  realmRoles: ['app-admin'],
  resourceRoles: {},
};

const audit = {
  createdBy: 'admin',
  createdByEmail: 'admin@test.com',
  updatedBy: 'admin',
  updatedByEmail: 'admin@test.com',
};

test('UsersService.linkKeycloak links an unlinked user', async () => {
  let updatedWith: Record<string, unknown> | null = null;
  const service = new UsersService({
    findById: async () => ({ id: 'user-1', tenantId: 'tenant-1', keycloakUserId: null }),
    findByKeycloakUserId: async () => null,
    updateById: async (_id: string, _tenantId: string, data: Record<string, unknown>) => {
      updatedWith = data;
      return { id: 'user-1', keycloakUserId: 'kc-new' };
    },
  } as never);

  const result = await service.linkKeycloak('user-1', 'kc-new', audit, authUser as never);

  assert.equal(result?.keycloakUserId, 'kc-new');
  assert.equal(updatedWith?.keycloakUserId, 'kc-new');
});

test('UsersService.linkKeycloak is idempotent when already linked to the same id', async () => {
  const service = new UsersService({
    findById: async () => ({ id: 'user-1', tenantId: 'tenant-1', keycloakUserId: 'kc-new' }),
  } as never);

  const result = await service.linkKeycloak('user-1', 'kc-new', audit, authUser as never);

  assert.equal(result?.keycloakUserId, 'kc-new');
});

test('UsersService.linkKeycloak throws 404 when user is missing', async () => {
  const service = new UsersService({
    findById: async () => null,
  } as never);

  await assert.rejects(
    () => service.linkKeycloak('missing', 'kc-new', audit, authUser as never),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test('UsersService.linkKeycloak throws 409 when user is already linked to another account', async () => {
  const service = new UsersService({
    findById: async () => ({ id: 'user-1', tenantId: 'tenant-1', keycloakUserId: 'kc-old' }),
  } as never);

  await assert.rejects(
    () => service.linkKeycloak('user-1', 'kc-new', audit, authUser as never),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});

test('UsersService.linkKeycloak throws 409 when the keycloak id is already taken', async () => {
  const service = new UsersService({
    findById: async () => ({ id: 'user-1', tenantId: 'tenant-1', keycloakUserId: null }),
    findByKeycloakUserId: async () => ({ id: 'user-2', keycloakUserId: 'kc-new' }),
  } as never);

  await assert.rejects(
    () => service.linkKeycloak('user-1', 'kc-new', audit, authUser as never),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});
