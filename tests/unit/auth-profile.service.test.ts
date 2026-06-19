import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthProfileService } from '../../src/modules/auth/auth-profile.service';

test('AuthProfileService.me returns empty local profile data for global support-admin', async () => {
  const service = new AuthProfileService({} as never, {} as never);

  const result = await service.me({
    sub: 'support-user',
    tenantId: '',
    name: 'Support User',
    email: 'support@test.com',
    preferredUsername: 'support',
    scope: null,
    realmRoles: ['support-admin'],
    resourceRoles: {},
  });

  assert.equal(result.user, null);
  assert.deepEqual(result.permissions, []);
  assert.equal(result.authUser.sub, 'support-user');
});

test('AuthProfileService.syncUser returns null for global support-admin without tenant context', async () => {
  const service = new AuthProfileService({} as never, {} as never);

  const result = await service.syncUser(
    {
      sub: 'support-user',
      tenantId: '',
      name: 'Support User',
      email: 'support@test.com',
      preferredUsername: 'support',
      scope: null,
      realmRoles: ['support-admin'],
      resourceRoles: {},
    },
    {
      createdBy: 'support-user',
      createdByEmail: 'support@test.com',
      updatedBy: 'support-user',
      updatedByEmail: 'support@test.com',
    },
  );

  assert.equal(result, null);
});
