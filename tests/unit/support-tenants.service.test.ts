import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../src/shared/errors/app-error';
import { SupportTenantsService } from '../../src/modules/support-tenants/support-tenants.service';

test('SupportTenantsService.listTenants returns paginated tenant list', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenants: async () => [
        {
          id: 'tenant-1',
          key: 'tenant-1',
          name: 'Tenant 1',
          active: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { users: 2, farms: 3 },
        },
      ],
      countTenants: async () => 1,
    } as never,
    {} as never,
  );

  const result = await service.listTenants({
    page: 1,
    limit: 10,
    search: 'tenant',
  });

  assert.equal(result.pagination.total, 1);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.stats.users, 2);
  assert.equal(result.data[0]?.stats.farms, 3);
});

test('SupportTenantsService.getTenantById throws 404 when tenant does not exist', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenantDetailsById: async () => null,
    } as never,
    {} as never,
  );

  await assert.rejects(() => service.getTenantById('missing-tenant'), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 404);
    return true;
  });
});

test('SupportTenantsService.getTenantById filters users missing in Keycloak', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenantDetailsById: async () => ({
        id: 'tenant-1',
        key: 'tenant-1',
        name: 'Tenant 1',
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        _count: { users: 2, farms: 1 },
        users: [
          {
            id: 'user-1',
            keycloakUserId: 'kc-1',
            name: 'User 1',
            email: 'user1@test.com',
            isAdmin: true,
            active: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'user-2',
            keycloakUserId: 'kc-2',
            name: 'User 2',
            email: 'user2@test.com',
            isAdmin: false,
            active: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        farmPermissions: [
          {
            id: 'perm-1',
            farmId: 'farm-1',
            userId: 'user-1',
            role: 'OWNER',
            active: true,
            user: { keycloakUserId: 'kc-1', name: 'User 1', email: 'user1@test.com' },
            farm: {
              id: 'farm-1',
              name: 'Farm 1',
              description: null,
              active: true,
            },
          },
          {
            id: 'perm-2',
            farmId: 'farm-1',
            userId: 'user-2',
            role: 'VIEWER',
            active: true,
            user: { keycloakUserId: 'kc-2', name: 'User 2', email: 'user2@test.com' },
            farm: {
              id: 'farm-1',
              name: 'Farm 1',
              description: null,
              active: true,
            },
          },
        ],
        farms: [
          {
            id: 'farm-1',
            name: 'Farm 1',
            description: null,
            active: true,
            fields: [],
          },
        ],
      }),
    } as never,
    {
      getUserById: async (keycloakUserId: string) =>
        keycloakUserId === 'kc-1' ? ({ id: 'kc-1' } as never) : null,
    } as never,
  );

  const result = await service.getTenantById('tenant-1');

  assert.equal(result.stats.users, 1);
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0]?.keycloakUserId, 'kc-1');
  assert.equal(result.permissions.length, 1);
  assert.equal(result.permissions[0]?.keycloakUserId, 'kc-1');
});

test('SupportTenantsService.listCatalogUnits returns paginated units list', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findUnits: async () => ({
        data: [
          {
            id: 'unit-1',
            name: 'Litro',
            symbol: 'LT',
            active: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      }),
    } as never,
    {} as never,
  );

  const result = await service.listCatalogUnits({
    page: 1,
    limit: 10,
    search: 'lit',
  });

  assert.equal(result.pagination.total, 1);
  assert.equal(result.data[0]?.symbol, 'LT');
});

test('SupportTenantsService.updateCatalogUnit updates active flag and fields', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findUnitById: async () => ({
        id: 'unit-1',
        name: 'Litro',
        symbol: 'LT',
        active: true,
      }),
      updateUnitById: async (id: string, data: Record<string, unknown>) => ({
        id,
        ...data,
      }),
    } as never,
    {} as never,
  );

  const result = await service.updateCatalogUnit(
    'unit-1',
    {
      name: 'Litro Atualizado',
      active: false,
    },
    {
      updatedBy: 'support-user',
      updatedByEmail: 'support@test.com',
    },
  );

  assert.equal(result.id, 'unit-1');
  assert.equal(result.name, 'Litro Atualizado');
  assert.equal(result.active, false);
});

test('SupportTenantsService.updateTenant throws 409 when key is already in use', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenantById: async () => ({
        id: 'tenant-1',
        key: 'tenant-1',
        name: 'Tenant 1',
        active: true,
      }),
      findTenantByKey: async () => ({
        id: 'tenant-2',
        key: 'tenant-2',
        name: 'Tenant 2',
        active: true,
      }),
    } as never,
    {} as never,
  );

  await assert.rejects(
    () =>
      service.updateTenant('tenant-1', {
        key: 'tenant-2',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
});

test('SupportTenantsService.updateTenantUser updates Keycloak and local user state', async () => {
  const calls: string[] = [];
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenantById: async () => ({
        id: 'tenant-1',
        key: 'tenant-1',
        name: 'Tenant 1',
        active: true,
      }),
      findUserByIdAndTenant: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        keycloakUserId: 'kc-1',
        name: 'Old User',
        email: 'old@test.com',
        isAdmin: false,
        active: true,
      }),
      updateTenantUserById: async (id: string, data: Record<string, unknown>) => ({
        id,
        ...data,
      }),
    } as never,
    {
      updateUser: async () => {
        calls.push('updateUser');
      },
      setRealmRole: async () => {
        calls.push('setRealmRole');
      },
    } as never,
  );

  const result = await service.updateTenantUser(
    'tenant-1',
    'user-1',
    {
      name: 'New User',
      email: 'new@test.com',
      isAdmin: true,
      active: false,
    },
    {
      updatedBy: 'support-user',
      updatedByEmail: 'support@test.com',
    },
  );

  assert.deepEqual(calls, ['updateUser', 'setRealmRole']);
  assert.equal(result.name, 'New User');
  assert.equal(result.email, 'new@test.com');
  assert.equal(result.isAdmin, true);
  assert.equal(result.active, false);
});

test('SupportTenantsService.resetTenantUserPassword delegates to Keycloak admin service', async () => {
  let calledWith: { keycloakUserId: string; password: string } | null = null;
  const service = new SupportTenantsService(
    {} as never,
    {
      findTenantById: async () => ({ id: 'tenant-1', key: 'tenant-1', active: true }),
      findUserByIdAndTenant: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        keycloakUserId: 'kc-1',
        name: 'User',
        email: 'user@test.com',
        isAdmin: false,
        active: true,
      }),
    } as never,
    {
      resetPassword: async (keycloakUserId: string, password: string) => {
        calledWith = { keycloakUserId, password };
      },
    } as never,
  );

  const result = await service.resetTenantUserPassword('tenant-1', 'user-1', {
    password: 'nova-senha-segura',
  });

  assert.deepEqual(calledWith, {
    keycloakUserId: 'kc-1',
    password: 'nova-senha-segura',
  });
  assert.deepEqual(result, { success: true });
});

test('SupportTenantsService.deactivateTenantFarm cascades deactivation to fields and permissions', async () => {
  const calls: string[] = [];
  const transactionClient = {
    farm: {
      update: async () => {
        calls.push('updateFarmById');
        return { id: 'farm-1', active: false };
      },
    },
    field: {
      updateMany: async () => {
        calls.push('setFieldsActiveByFarmId');
        return { count: 2 };
      },
    },
    farmUserPermission: {
      updateMany: async () => {
        calls.push('setPermissionsActiveByFarmId');
        return { count: 2 };
      },
    },
  };
  const service = new SupportTenantsService(
    {
      $transaction: async <T>(callback: (transaction: unknown) => Promise<T>) =>
        callback(transactionClient),
    } as never,
    {
      findFarmByIdAndTenant: async () => ({
        id: 'farm-1',
        tenantId: 'tenant-1',
        name: 'Farm 1',
        active: true,
      }),
    } as never,
    {} as never,
  );

  await service.deactivateTenantFarm(
    'tenant-1',
    'farm-1',
    {
      updatedBy: 'support-user',
      updatedByEmail: 'support@test.com',
    },
  );

  assert.deepEqual(calls, [
    'updateFarmById',
    'setFieldsActiveByFarmId',
    'setPermissionsActiveByFarmId',
  ]);
});

test('SupportTenantsService.createTenantPermission reactivates existing permission', async () => {
  const service = new SupportTenantsService(
    {} as never,
    {
      findFarmByIdAndTenant: async () => ({
        id: 'farm-1',
        tenantId: 'tenant-1',
        name: 'Farm 1',
        active: true,
      }),
      findUserByIdAndTenant: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        keycloakUserId: 'kc-1',
        name: 'User 1',
        email: 'user1@test.com',
        isAdmin: false,
        active: true,
      }),
      findFarmPermissionByFarmAndUserId: async () => ({
        id: 'permission-1',
        tenantId: 'tenant-1',
        farmId: 'farm-1',
        userId: 'user-1',
        role: 'VIEWER',
        active: false,
      }),
      updateFarmPermissionById: async (id: string, data: Record<string, unknown>) => ({
        id,
        ...data,
      }),
    } as never,
    {} as never,
  );

  const result = await service.createTenantPermission(
    'tenant-1',
    {
      farmId: 'farm-1',
      userId: 'user-1',
      role: 'MANAGER',
    },
    {
      createdBy: 'support-user',
      createdByEmail: 'support@test.com',
      updatedBy: 'support-user',
      updatedByEmail: 'support@test.com',
    },
  );

  assert.equal(result.id, 'permission-1');
  assert.equal(result.role, 'MANAGER');
  assert.equal(result.active, true);
});
