import assert from 'node:assert/strict';
import test from 'node:test';

test('CORS preflight allows PATCH for support and user CRUD flows', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/funciona-agro-test';
  process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

  const { buildApp } = await import('../../src/app');
  const app = buildApp();

  try {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/support/tenants/tenant-1/users/user-1',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
      },
    });

    assert.equal(res.statusCode, 204);
    assert.match(res.headers['access-control-allow-methods'] ?? '', /PATCH/);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  } finally {
    await app.close();
  }
});
