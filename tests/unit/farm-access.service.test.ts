import test from 'node:test';
import assert from 'node:assert/strict';
import { FarmAccessService } from '../../src/modules/auth/farm-access.service';
import { AppError } from '../../src/shared/errors/app-error';

test('FarmAccessService blocks user without permission for requested farm', async () => {
  const service = new FarmAccessService({
    findActiveByKeycloakUserId: async () => [{ farmId: 'farm-1' }],
    findActiveFarmIdsByKeycloakUserId: async () => ['farm-1'],
  } as never);

  await assert.rejects(
    () =>
      service.assertUserCanAccessFarm({
        authUser: {
          sub: 'user-1',
          tenantId: 'tenant-1',
          name: 'User',
          email: 'user@test.com',
          preferredUsername: 'user',
          scope: null,
          realmRoles: [],
          resourceRoles: {},
        },
        farmId: 'farm-2',
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 403,
  );
});

test('FarmAccessService allows app-admin global access', async () => {
  const service = new FarmAccessService({
    findActiveByKeycloakUserId: async () => [],
    findActiveFarmIdsByKeycloakUserId: async () => [],
  } as never);

  await assert.doesNotReject(() =>
    service.assertUserCanAccessFarm({
      authUser: {
        sub: 'admin-1',
        tenantId: 'tenant-1',
        name: 'Admin',
        email: 'admin@test.com',
        preferredUsername: 'admin',
        scope: null,
        realmRoles: ['app-admin'],
        resourceRoles: {},
      },
      farmId: 'any-farm',
    }),
  );
});
