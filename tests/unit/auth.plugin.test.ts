import test from 'node:test';
import assert from 'node:assert/strict';
import { isPortalAdmin, isSupportAdmin } from '../../src/modules/auth/auth.plugin';

test('isSupportAdmin allows support-admin realm role', () => {
  const result = isSupportAdmin({
    authUser: {
      sub: 'support-user',
      tenantId: 'tenant-1',
      name: 'Support User',
      email: 'support@test.com',
      preferredUsername: 'support',
      scope: null,
      realmRoles: ['support-admin'],
      resourceRoles: {},
    },
  } as never);

  assert.equal(result, true);
});

test('isSupportAdmin blocks app-admin without support-admin realm role', () => {
  const result = isSupportAdmin({
    authUser: {
      sub: 'app-admin-user',
      tenantId: 'tenant-1',
      name: 'App Admin User',
      email: 'admin@test.com',
      preferredUsername: 'app-admin',
      scope: null,
      realmRoles: ['app-admin'],
      resourceRoles: {},
    },
  } as never);

  assert.equal(result, false);
});

test('isSupportAdmin blocks users without support roles', () => {
  const result = isSupportAdmin({
    authUser: {
      sub: 'normal-user',
      tenantId: 'tenant-1',
      name: 'Normal User',
      email: 'user@test.com',
      preferredUsername: 'user',
      scope: null,
      realmRoles: ['farm-viewer'],
      resourceRoles: {},
    },
  } as never);

  assert.equal(result, false);
});

test('isPortalAdmin allows app-admin realm role', () => {
  const result = isPortalAdmin({
    authUser: {
      sub: 'app-admin-user',
      tenantId: 'tenant-1',
      name: 'App Admin User',
      email: 'admin@test.com',
      preferredUsername: 'app-admin',
      scope: null,
      realmRoles: ['app-admin'],
      resourceRoles: {},
    },
  } as never);

  assert.equal(result, true);
});

test('isPortalAdmin allows support-admin realm role', () => {
  const result = isPortalAdmin({
    authUser: {
      sub: 'support-user',
      tenantId: 'tenant-1',
      name: 'Support User',
      email: 'support@test.com',
      preferredUsername: 'support',
      scope: null,
      realmRoles: ['support-admin'],
      resourceRoles: {},
    },
  } as never);

  assert.equal(result, true);
});
